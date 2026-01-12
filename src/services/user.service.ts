import { UserRepository } from "@/repositories/user.repository";
import { User, CreateUserDto, UpdateUserDto } from "@/types/user.types";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  }

  async getUserProfile(id: string): Promise<User | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    // Transform user data - add business logic here
    return this.transformUserData(user);
  }

  async createUser(data: CreateUserDto): Promise<User> {
    // Add validation and business logic here
    this.validateUserData(data);
    
    const user = await this.userRepository.createUser(data);
    return this.transformUserData(user);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User | null> {
    const user = await this.userRepository.update(id, data);
    return this.transformUserData(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  private validateUserData(data: CreateUserDto): void {
    if (!data.email || !data.email.includes("@")) {
      throw new Error("Invalid email address");
    }
    if (!data.name || data.name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (!data.password || data.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
  }

  private transformUserData(user: User): User {
    // Add any data transformation logic here
    return {
      ...user,
      createdAt: user.createdAt || new Date().toISOString(),
    };
  }
}

export const userService = new UserService(
  new (require("@/repositories/user.repository").UserRepository)()
);
