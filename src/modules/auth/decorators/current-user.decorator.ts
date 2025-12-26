import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Current User Decorator
 *
 * Extracts the authenticated user from the request object.
 * The user is attached to the request by the JwtStrategy after token validation.
 *
 * Usage:
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 *
 * You can also extract specific user properties:
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 *
 * @param data - Optional property name to extract from user object
 * @param ctx - Execution context
 * @returns The user object or a specific property if specified
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return only that property
    if (data) {
      return user?.[data];
    }

    // Return the entire user object
    return user;
  },
);
