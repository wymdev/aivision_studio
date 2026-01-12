import { BaseRepository } from "./base.repository";
import { User, CreateUserDto } from "@/types/user.types";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("/users");
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.findAll();
      return users.find((user) => user.email === email) || null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      return null;
    }
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return this.create(data as Partial<User>);
  }
}

export const userRepository = new UserRepository();
