export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token?: string;
}
