export function createUserService({ client, config }) {
  let workspaceIdPromise = null;
  let currentUserPromise = null;
  const teamMemberPromises = new Map();

  async function getWorkspaceId() {
    if (config.workspaceId) {
      return config.workspaceId;
    }

    if (!workspaceIdPromise) {
      workspaceIdPromise = client.requestV2('/team').then((response) => {
        const teams = response.teams ?? [];
        if (teams.length === 0) {
          throw new Error('No workspaces found for this ClickUp token.');
        }
        return String(teams[0].id);
      });
    }

    return workspaceIdPromise;
  }

  async function getCurrentUser() {
    if (!currentUserPromise) {
      currentUserPromise = client.requestV2('/user').then((response) => response.user);
    }

    return currentUserPromise;
  }

  async function getCurrentUserId() {
    if (config.userId) {
      return config.userId;
    }

    const user = await getCurrentUser();
    return String(user.id);
  }

  async function getTeamMembers(workspaceId = null) {
    const targetWorkspaceId = workspaceId ?? await getWorkspaceId();
    if (!teamMemberPromises.has(targetWorkspaceId)) {
      const promise = client
        .requestV2(`/team/${targetWorkspaceId}`)
        .then((response) => response.team?.members ?? []);
      teamMemberPromises.set(targetWorkspaceId, promise);
    }

    return teamMemberPromises.get(targetWorkspaceId);
  }

  async function findUser(query, workspaceId = null) {
    const targetWorkspaceId = workspaceId ?? await getWorkspaceId();
    const normalized = query.toLowerCase().trim();
    const members = await getTeamMembers(targetWorkspaceId);

    const exactIdMatch = members.find((member) => String(member.user.id) === query);
    if (exactIdMatch) {
      return exactIdMatch.user;
    }

    for (const member of members) {
      const user = member.user;
      if (
        user.username?.toLowerCase() === normalized ||
        user.email?.toLowerCase() === normalized ||
        user.initials?.toLowerCase() === normalized
      ) {
        return user;
      }
    }

    for (const member of members) {
      const user = member.user;
      if (
        user.username?.toLowerCase().includes(normalized) ||
        user.email?.toLowerCase().includes(normalized)
      ) {
        return user;
      }
    }

    return null;
  }

  return {
    getWorkspaceId,
    getCurrentUser,
    getCurrentUserId,
    getTeamMembers,
    findUser,
  };
}
