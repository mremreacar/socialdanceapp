import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  EmailVerification: { email: string };
  ForgotPassword: { email?: string } | undefined;
  ForgotPasswordSent: { email: string };
  Preferences: undefined;
  SignUp: undefined;
  Onboarding: { startFromStep?: number } | undefined;
};

export type MainTabsParamList = {
  Explore: undefined;
  Schools: { isMapView?: boolean } | undefined;
  DanceCircle: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  EventDetails: { id: string; fromFavorites?: boolean };
  SchoolDetails: { id: string };
  ClassDetails: { id: string };
  DanceStar: undefined;
  EditEvent: undefined;
  EditClass: { draftData?: any };
  ChatList: undefined;
  ChatDetail: { id: string; name: string; avatar: string; isNewChat?: boolean };
  NewChat: undefined;
  Marketplace: undefined;
  Cart: undefined;
  AddProduct: { productId?: string };
  ProductDetail: { id: string };
  Settings: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SettingsPassword: undefined;
  SettingsPayments: undefined;
  SettingsHelp: undefined;
  SettingsAbout: undefined;
  UserProfile: { userId: string; name: string; username?: string; avatar: string; bio?: string };
};

export type DrawerParamList = {
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<DrawerParamList>;
};
