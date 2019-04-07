// @flow
import Document from '../models/Document';
import { Collection } from '../models';

export default async function documentMover({
  document,
  collectionId,
  parentDocumentId,
  index,
}: {
  document: Document,
  collectionId: string,
  parentDocumentId: string,
  index?: number,
}) {
  const response = { collections: [], documents: [] };
  const collectionChanged = collectionId !== document.collectionId;

  // remove from original collection
  const collection: Collection = await document.getCollection();
  const documentJson = await collection.removeDocumentInStructure(document);

  // add to new collection
  const newCollection: Collection = collectionChanged
    ? await Collection.findById(collectionId)
    : collection;
  await newCollection.addDocumentToStructure(document, index, { documentJson });
  response.collections.push(collection);

  // if collection does not remain the same loop through children and change their
  // collectionId too. This includes archived children, otherwise their collection
  // would be wrong once restored.
  if (collectionChanged) {
    response.collections.push(newCollection);

    const loopChildren = async documentId => {
      const childDocuments = await Document.findAll({
        where: { parentDocumentId: documentId },
      });
      childDocuments.forEach(async child => {
        await loopChildren(child.id);
        await child.update({ collectionId });
        response.documents.push(child);
      });
    };

    await loopChildren(document.id);
    await document.update({
      collectionId,
      parentDocumentId,
    });
    response.documents.push(document);
  }

  // we need to send all updated models back to the client
  return response;
}
