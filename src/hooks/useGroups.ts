import { useEffect, useMemo, useState } from 'react';
import { subscribeGroup, subscribeMyGroups } from '../services/groupService';
import { subscribeDirectConversations } from '../services/chatService';
import { getPublicProfiles } from '../services/userService';
import { otherParticipant } from '../utils/conversationId';
import { friendlyError } from '../utils/errors';
import type { ChatGroup } from '../types/group';
import type { ConversationListItem, DirectConversation } from '../types/chat';
import type { PublicProfile } from '../types/user';

export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return undefined;
    return subscribeGroup(
      groupId,
      (g) => {
        setGroup(g);
        setLoading(false);
      },
      (e) => {
        setError(friendlyError(e, 'Não foi possível carregar o grupo.'));
        setLoading(false);
      },
    );
  }, [groupId]);

  return { group, loading, error };
}

/** Perfis públicos de uma lista de uids (para nomes/fotos). */
export function useProfiles(uids: string[]): Record<string, PublicProfile> {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const key = useMemo(() => [...uids].sort().join(','), [uids]);

  useEffect(() => {
    let active = true;
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setProfiles({});
      return undefined;
    }
    getPublicProfiles(ids)
      .then((result) => {
        if (active) setProfiles(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);

  return profiles;
}

/** Combina conversas diretas e grupos do usuário em uma lista ordenada. */
export function useConversations(uid: string) {
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loadingDirects, setLoadingDirects] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return undefined;
    const onError = (e: unknown) => setError(friendlyError(e, 'Não foi possível carregar as conversas.'));
    const unsubDirect = subscribeDirectConversations(uid, (list) => {
      setDirects(list);
      setLoadingDirects(false);
    }, (e) => {
      onError(e);
      setLoadingDirects(false);
    });
    const unsubGroups = subscribeMyGroups(uid, (list) => {
      setGroups(list);
      setLoadingGroups(false);
    }, (e) => {
      onError(e);
      setLoadingGroups(false);
    });
    return () => {
      unsubDirect();
      unsubGroups();
    };
  }, [uid]);

  const otherIds = useMemo(() => directs.map((d) => otherParticipant(d.participants, uid)), [directs, uid]);
  const profiles = useProfiles(otherIds);

  const items = useMemo<ConversationListItem[]>(() => {
    const directItems: ConversationListItem[] = directs.map((conversation) => ({
      kind: 'direct',
      conversation,
      other: profiles[otherParticipant(conversation.participants, uid)] ?? null,
      sortKey: conversation.createdAt,
    }));
    const groupItems: ConversationListItem[] = groups.map((group) => ({
      kind: 'group',
      group,
      sortKey: group.updatedAt,
    }));
    return [...directItems, ...groupItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [directs, groups, profiles, uid]);

  return { items, loading: loadingDirects || loadingGroups, error };
}
