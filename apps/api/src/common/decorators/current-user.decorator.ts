import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@madcreate/shared';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as JwtPayload | undefined;
});
