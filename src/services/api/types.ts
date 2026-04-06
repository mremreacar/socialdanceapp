export type UserDto = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  favoriteDances?: string[] | null;
  otherInterests?: string | null;
  notificationsEnabled?: boolean | null;
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type LoginResponseDto = {
  accessToken: string;
  refreshToken: string;
  user?: UserDto;
};

export type SignUpRequestDto = LoginRequestDto & {
  displayName: string;
  username: string;
};

export type SignUpResponseDto = {
  accessToken?: string;
  refreshToken?: string;
  needsEmailConfirmation: boolean;
  user?: UserDto;
};

export type MeResponseDto = {
  user: UserDto;
};

export type UpdateMeRequestDto = Partial<Pick<UserDto,
  | 'displayName'
  | 'username'
  | 'email'
  | 'city'
  | 'avatarUrl'
  | 'bio'
  | 'favoriteDances'
  | 'otherInterests'
  | 'notificationsEnabled'
>>;

export type UpdateMeResponseDto = {
  user: UserDto;
};
