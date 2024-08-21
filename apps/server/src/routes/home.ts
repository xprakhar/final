import { inject } from 'inversify';
import {
  interfaces,
  controller,
  httpGet,
  httpPost,
  httpPatch,
  request,
  response,
  queryParam,
} from 'inversify-express-utils';
import { TYPES } from '../inversify-types';
import { SignupForm, schema as signupSchema } from '../schemas/signup';
import { schema as loginSchema } from '../schemas/login';
import type { Request, Response } from 'express';
import { type IUsersRepository } from '../utils/repos/user-repo';
import { type IAuthService } from 'src/services/auth-service';
import { StatusCodes } from 'http-status-codes';
import { sendErrorResponse, sendSuccessResponse } from '../utils/helpers';

@controller('/')
export class Home implements interfaces.Controller {
  private userRepo: IUsersRepository;
  private authService: IAuthService;

  constructor(
    @inject<IUsersRepository>(TYPES.UserRepo) userRepo: IUsersRepository,
    @inject<IAuthService>(TYPES.AuthService) authService: IAuthService,
  ) {
    this.userRepo = userRepo;
    this.authService = authService;
  }

  @httpPost('signup')
  async register(@request() req: Request, @response() res: Response) {
    try {
      const { username, password, email, birthdate }: SignupForm =
        signupSchema.parse(req.body);

      const user = await this.userRepo.save({
        username,
        password,
        email,
        birthdate,
      });

      sendSuccessResponse(
        res,
        StatusCodes.CREATED,
        'User successfully registered',
        {
          username: user._id,
          email: user.email,
        },
      );
    } catch (err) {
      const error = err as Error;
      sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        `An error occurred during user registration: ${error.message}`,
        error,
      );
    }
  }

  @httpPost('login')
  async login(@request() req: Request, @response() res: Response) {
    try {
      const { username: email, password } = loginSchema.parse(req.body);

      const { accessToken: jwt, refreshToken } =
        await this.authService.authorize(email, password);

      sendSuccessResponse(res, StatusCodes.OK, 'Login successful', {
        jwt,
        refreshToken,
      });
    } catch (err) {
      const error = err as Error;
      sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        `Login failed: ${error.message}`,
        error,
      );
    }
  }

  @httpGet('authenticate')
  async authenticate(@request() req: Request, @response() res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token is missing');
      }

      const token = authHeader.substring(7);
      const user = await this.authService.authenticate(token);

      sendSuccessResponse(res, StatusCodes.OK, `Hello ${user.email}`);
    } catch (err) {
      const error = err as Error;
      sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        `Authentication failed: ${error.message}`,
        error,
      );
    }
  }

  @httpPatch('logout')
  async logout(@request() req: Request, @response() res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token is missing');
      }

      const token = authHeader.substring(7);
      await this.authService.revokeToken(token);

      sendSuccessResponse(res, StatusCodes.OK, 'Logged out successfully');
    } catch (err) {
      const error = err as Error;
      sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        `Logout failed: ${error.message}`,
        error,
      );
    }
  }

  @httpPatch('refresh')
  async refresh(
    @queryParam('refreshToken') refreshToken: string,
    @response() res: Response,
  ) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is missing');
      }

      const tokens = await this.authService.refreshAccessToken(refreshToken);
      sendSuccessResponse(res, StatusCodes.OK, 'Token refreshed successfully', {
        jwt: tokens.accessToken,
      });
    } catch (err) {
      const error = err as Error;
      sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        `Token refresh failed: ${error.message}`,
        error,
      );
    }
  }
}
