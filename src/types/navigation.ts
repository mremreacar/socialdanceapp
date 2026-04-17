import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  EmailVerification: { email: string };
  ForgotPassword: { email?: string } | undefined;
  ForgotPasswordSent: { email: string };
  Preferences: undefined;
  SignUp: undefined;
  Onboarding: undefined;
};

export type MainTabsParamList = {
  Explore: undefined;
  Schools: { isMapView?: boolean } | undefined;
  DanceCircle: undefined;
  Favorites: undefined;
  Lessons: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  EventDetails: { id: string; fromFavorites?: boolean; includeUnpublished?: boolean };
  SchoolDetails: { id: string };
  SchoolAdminPanel: { schoolId: string };
  FavoriteSchools: undefined;
  FavoritesHub: undefined;
  ClassDetails: { id: string };
  DanceStar: {
    eventId?: string;
    eventTitle?: string;
    attendees?: { id: string; name: string; avatar: string }[];
  } | undefined;
  EditEvent: { eventId?: string; preselectedSchoolId?: string; preselectedSchoolName?: string } | undefined;
  EditClass: { draftData?: any; preselectedSchoolId?: string; preselectedSchoolName?: string } | undefined;
  ChatList: undefined;
  ChatDetail: {
    id: string;
    name: string;
    avatar: string;
    isNewChat?: boolean;
    /** Liste ekranından geliyorsa tekrar oluşturmayı atlamak için */
    conversationId?: string;
  };
  NewChat: undefined;
  Settings: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SettingsPassword: undefined;
  SettingsPayments: undefined;
  SettingsReservations: undefined;
  BlockedUsers: undefined;
  SettingsHelp: undefined;
  SettingsAbout: undefined;
  UserProfile: {
    userId: string;
    name: string;
    username?: string;
    avatar: string;
    bio?: string;
    /** Sohbetten “Profilini gör” ile gelindiyse şikayet için sohbet id’si */
    conversationId?: string;
  };
  UserPanel: undefined;
  InstructorsList: undefined;
  InstructorOnboarding: undefined;
  InstructorSchoolPanel: undefined;
  Lessons: undefined;
};

export type DrawerParamList = {
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<DrawerParamList>;
};
