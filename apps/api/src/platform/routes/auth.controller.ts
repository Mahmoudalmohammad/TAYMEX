import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { SessionActorResponse, SignInRequest } from '../../generated/api-contracts.generated.js';
import { apiOperations } from '../../generated/api-contracts.generated.js';
import { ApiPolicy } from '../http-policy.js';
import { API_RUNTIME, type ApiRuntime } from '../runtime.js';
import type { ApiHttpReply, ApiHttpRequest } from '../http-types.js';
import { requireRequestContext } from '../http-types.js';
import { createSessionCookie, clearSessionCookie } from '../session-cookie.js';
import { optionalString, requireObjectBody, requiredString } from '../http-input.js';

@Controller()
export class AuthHttpController {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  @Post(apiOperations.authSignIn.nestPath)
  @HttpCode(apiOperations.authSignIn.successStatus)
  @ApiPolicy(apiOperations.authSignIn)
  async signIn(
    @Body() body: unknown,
    @Req() request: ApiHttpRequest,
    @Res({ passthrough: true }) reply: ApiHttpReply,
  ): Promise<SessionActorResponse> {
    const input = requireObjectBody(body, ['email', 'password', 'clientLabel'], ['email', 'password']);
    const parsed: SignInRequest = Object.freeze({
      email: requiredString(input.email, 'email', 320),
      password: requiredString(input.password, 'password', 128),
      ...(input.clientLabel === undefined ? {} : { clientLabel: optionalString(input.clientLabel, 'clientLabel', 120) }),
    });
    const context = requireRequestContext(request);
    const signedIn = await this.runtime.identity.signIn({ ...parsed, correlationId: context.correlationId });
    reply.header('set-cookie', createSessionCookie(signedIn.sessionSecret, this.runtime.sessionTtlSeconds));
    return actorResponse(signedIn.actor.accountId, signedIn.actor.assurance);
  }

  @Post(apiOperations.authSignOut.nestPath)
  @HttpCode(apiOperations.authSignOut.successStatus)
  @ApiPolicy(apiOperations.authSignOut)
  async signOut(
    @Req() request: ApiHttpRequest,
    @Res({ passthrough: true }) reply: ApiHttpReply,
  ): Promise<void> {
    const context = requireRequestContext(request);
    if (!context.sessionSecret) throw new Error('Authenticated HTTP context is missing its session secret.');
    await this.runtime.identity.signOut(context.sessionSecret, context.correlationId);
    reply.header('set-cookie', clearSessionCookie());
  }

  @Get(apiOperations.authCurrentSession.nestPath)
  @HttpCode(apiOperations.authCurrentSession.successStatus)
  @ApiPolicy(apiOperations.authCurrentSession)
  currentSession(@Req() request: ApiHttpRequest): SessionActorResponse {
    const context = requireRequestContext(request);
    if (!context.actor) throw new Error('Authenticated HTTP context is missing its actor.');
    return actorResponse(context.actor.accountId, context.actor.assurance);
  }
}

function actorResponse(accountId: string, assurance: 'AAL1' | 'AAL2'): SessionActorResponse {
  return Object.freeze({ accountId, assurance });
}
