export function createDocService({ client, userService }) {
  async function searchDocs(options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const params = new URLSearchParams();
    if (options.query) {
      params.set('query', options.query);
    }
    const query = params.toString();
    const response = await client.requestV3(
      `/workspaces/${workspaceId}/docs${query ? `?${query}` : ''}`
    );
    return response.docs ?? [];
  }

  async function getDoc(docId) {
    const workspaceId = await userService.getWorkspaceId();
    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}`);
  }

  async function getDocPageListing(docId) {
    const workspaceId = await userService.getWorkspaceId();
    const response = await client.requestV3(
      `/workspaces/${workspaceId}/docs/${docId}/pageListing`
    );
    return response.pages ?? [];
  }

  async function getPage(docId, pageId, contentFormat = 'text/md') {
    const workspaceId = await userService.getWorkspaceId();
    const page = await client.requestV3(
      `/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`,
      {
        headers: {
          Accept: contentFormat,
        },
      }
    );

    if (typeof page === 'string') {
      return {
        id: pageId,
        name: pageId,
        content: page,
      };
    }

    return page;
  }

  async function createDoc(name, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const doc = await client.requestV3(`/workspaces/${workspaceId}/docs`, {
      method: 'POST',
      body: {
        name,
        ...(options.parent ? { parent: options.parent } : {}),
        ...(options.visibility ? { visibility: options.visibility } : {}),
      },
    });

    if (options.content && doc.id) {
      const pages = await getDocPageListing(doc.id);
      if (pages.length > 0) {
        const firstPageId = pages[0].id;
        await editPage(doc.id, firstPageId, { content: options.content });
        return {
          ...doc,
          firstPageId,
        };
      }
    }

    return doc;
  }

  async function createPage(docId, name, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}/pages`, {
      method: 'POST',
      body: {
        name,
        ...(options.content ? { content: options.content } : {}),
        ...(options.parentPageId ? { parent_page_id: options.parentPageId } : {}),
        ...(options.subTitle ? { sub_title: options.subTitle } : {}),
      },
    });
  }

  async function editPage(docId, pageId, updates) {
    const workspaceId = await userService.getWorkspaceId();
    const body = {};
    if (updates.name !== undefined) {
      body.name = updates.name;
    }
    if (updates.content !== undefined) {
      body.content = updates.content;
    }
    if (updates.subTitle !== undefined) {
      body.sub_title = updates.subTitle;
    }

    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`, {
      method: 'PUT',
      body,
    });
  }

  return {
    searchDocs,
    getDoc,
    getDocPageListing,
    getPage,
    createDoc,
    createPage,
    editPage,
  };
}
