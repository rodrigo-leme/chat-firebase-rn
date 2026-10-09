import React, { useCallback } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Loading } from '../components/Feedback';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { PushData } from '../types/notification';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function AppNavigator() {
  const { user, initializing } = useAuth();

  // Toque na notificação → abre a conversa do payload.
  const openFromPush = useCallback((data: PushData) => {
    const go = () =>
      navigationRef.navigate('Chat', { conversationId: data.conversationId, conversationType: data.conversationType });
    if (navigationRef.isReady()) go();
    else setTimeout(go, 600);
  }, []);

  const notificationStatus = useNotifications(user?.uid ?? null, openFromPush);

  if (initializing) return <Loading label="Recuperando sessão…" />;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {user ? (
          // Ao sair, estas telas são desmontadas e seus listeners removidos.
          <>
            <Stack.Screen name="Conversations" options={{ title: 'Conversas' }}>
              {(props) => <ConversationsScreen {...props} notificationStatus={notificationStatus} />}
            </Stack.Screen>
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="GroupForm" component={GroupFormScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
