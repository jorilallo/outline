// @flow
import { observable, computed, action, runInAction, ObservableMap } from 'mobx';
import { client } from 'utils/ApiClient';
import { orderBy, filter } from 'lodash';
import invariant from 'invariant';
import BaseStore from './BaseStore';
import UiStore from './UiStore';

import Document from 'models/Document';
import type { Revision, PaginationParams } from 'types';

class RevisionsStore extends BaseStore {
  @observable data: Map<string, Revision> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  ui: UiStore;

  @computed
  get orderedData(): Revision[] {
    return orderBy(this.data.values(), 'createdAt', 'desc');
  }

  getDocumentRevisions(documentId: string): Revision[] {
    return filter(this.orderedData, { documentId });
  }

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/documents.revisions', options);
      invariant(res && res.data, 'Document revisions not available');
      const { data } = res;
      runInAction('RevisionsStore#fetchPage', () => {
        data.forEach(revision => {
          this.data.set(revision.id, new Document(revision));
        });
        this.isLoaded = true;
      });
      return res;
    } catch (e) {
      this.ui.showToast('Failed to load document revisions');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  add = (data: Revision): void => {
    this.data.set(data.id, data);
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Revision => {
    return this.data.get(id);
  };

  constructor(options: { ui: UiStore }) {
    super();
    this.ui = options.ui;
  }
}

export default RevisionsStore;
