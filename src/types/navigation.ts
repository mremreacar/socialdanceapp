import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Onboarding: { startFromStep?: number } | undefined;
};

export type MainTabsParamList = {
  Explore: undefined;
  Schools: undefined;
  DancerTrack: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  EventDetails: { id: string };
  SchoolDetails: { id: string };
  ClassDetails: { id: string };
  DanceQueen: undefined;
  EditEvent: undefined;
  EditClass: { draftData?: any };
  ChatList: undefined;
  ChatDetail: { id: string; name: string; avatar: string; isNewChat?: boolean };
  NewChat: undefined;
  Marketplace: undefined;
  Cart: undefined;
  AddProduct: undefined;
  ProductDetail: { id: string };
  Settings: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SettingsPassword: undefined;
  SettingsPayments: undefined;
  SettingsHelp: undefined;
  SettingsAbout: undefined;
};

export type DrawerParamList = {
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<DrawerParamList>;
};
