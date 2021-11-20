import invariant from "invariant";
import { filter } from "lodash";
import { action, runInAction } from "mobx";
import BaseStore, { RPCAction } from "~/stores/BaseStore";
import RootStore from "~/stores/RootStore";
import { FetchOptions, PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import Revision from "../models/Revision";

export default class RevisionsStore extends BaseStore<Revision> {
  actions = [RPCAction.List];

  constructor(rootStore: RootStore) {
    super(rootStore, Revision);
  }

  getDocumentRevisions(documentId: string): Revision[] {
    const revisions = filter(this.orderedData, {
      documentId,
    });
    const latestRevision = revisions[0];
    const document = this.rootStore.documents.get(documentId);

    // There is no guarantee that we have a revision that represents the latest
    // state of the document. This pushes a fake revision in at the top if there
    // isn't one
    if (
      latestRevision &&
      document &&
      latestRevision.createdAt !== document.updatedAt
    ) {
      revisions.unshift(
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        new Revision({
          id: "latest",
          documentId: document.id,
          title: document.title,
          text: document.text,
          createdAt: document.updatedAt,
          createdBy: document.createdBy,
        })
      );
    }

    return revisions;
  }

  @action
  fetch = async (
    id: string,
    options?: FetchOptions
  ): Promise<Revision | null | undefined> => {
    this.isFetching = true;
    invariant(id, "Id is required");

    try {
      const rev = this.data.get(id);
      if (rev) return rev;
      const res = await client.post("/revisions.info", {
        id,
      });
      invariant(res && res.data, "Revision not available");
      this.add(res.data);
      runInAction("RevisionsStore#fetch", () => {
        this.isLoaded = true;
      });
      return this.data.get(res.data.id);
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchPage = async (
    options: PaginationParams | null | undefined
  ): Promise<any> => {
    this.isFetching = true;

    try {
      const res = await client.post("/revisions.list", options);
      invariant(res && res.data, "Document revisions not available");
      runInAction("RevisionsStore#fetchPage", () => {
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'revision' implicitly has an 'any' type.
        res.data.forEach((revision) => this.add(revision));
        this.isLoaded = true;
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };
}
