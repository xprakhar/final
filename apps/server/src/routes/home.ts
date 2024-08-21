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
import { StatusCodes } from 'http-status-codes';
import errorHandler from '../utils/error-handler';
import { TYPES } from '../inversify-types';
import { SignupForm, schema as signupSchema } from '../schemas/signup';
import { schema as loginSchema } from '../schemas/login';
import type { Request, Response } from 'express';
import { type IUsersRepository } from '../utils/repos/user-repo';
import { type IAuthService } from 'src/services/auth-service';

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

      await this.userRepo.save({
        username,
        password,
        email,
        birthdate,
      });

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: { ...(await this.authService.authorize(email, password)) },
      });
    } catch (err) {
      errorHandler(err as Error, req, res);
    }
  }

  @httpPost('login')
  async login(@request() req: Request, @response() res: Response) {
    try {
      const { username: email, password } = loginSchema.parse(req.body);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: { ...(await this.authService.authorize(email, password)) },
      });
    } catch (err) {
      errorHandler(err as Error, req, res);
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
      const { _id: username, email } =
        await this.authService.authenticate(token);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          username,
          email,
        },
      });
    } catch (err) {
      errorHandler(err as Error, req, res);
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

      res.status(StatusCodes.OK).json({
        status: 'success',
      });
    } catch (err) {
      errorHandler(err as Error, req, res);
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
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          accessToken: tokens.accessToken,
        },
      });
    } catch (err) {
      errorHandler(err as Error, null, res);
    }
  }
}
