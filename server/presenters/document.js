// @flow
import { takeRight } from 'lodash';
import { User, Document, Attachment } from '../models';
import { getSignedImageUrl } from '../utils/s3';
import presentUser from './user';

type Options = {
  isPublic?: boolean,
};

const attachmentRegex = /!\[.*\]\(\/api\/attachments\.redirect\?id=(?<id>.*)\)/gi;

// replaces attachments.redirect urls with signed/authenticated url equivalents
async function replaceImageAttachments(text) {
  const attachmentIds = [...text.matchAll(attachmentRegex)].map(
    match => match.groups && match.groups.id
  );

  for (const id of attachmentIds) {
    const attachment = await Attachment.findByPk(id);
    const accessUrl = await getSignedImageUrl(attachment.key);
    text = text.replace(attachment.redirectUrl, accessUrl);
  }

  return text;
}

// previously titles were stored in the text and title fields. To account for old
// documents we need to strip the duplicate title.
function removeTitle(text) {
  return text.replace(/^#\s(.*)\n/, '');
}

export default async function present(document: Document, options: ?Options) {
  options = {
    isPublic: false,
    ...options,
  };

  let text = options.isPublic
    ? await replaceImageAttachments(document.text)
    : document.text;

  text = removeTitle(text);

  const data = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    text,
    emoji: document.emoji,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    deletedAt: document.deletedAt,
    teamId: document.teamId,
    collaborators: [],
    starred: document.starred ? !!document.starred.length : undefined,
    revision: document.revisionCount,
    pinned: undefined,
    collectionId: undefined,
    parentDocumentId: undefined,
  };

  if (!options.isPublic) {
    data.pinned = !!document.pinnedById;
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    data.createdBy = presentUser(document.createdBy);
    data.updatedBy = presentUser(document.updatedBy);

    // TODO: This could be further optimized
    data.collaborators = await User.findAll({
      where: {
        id: takeRight(document.collaboratorIds, 10) || [],
      },
    }).map(presentUser);
  }

  return data;
}
