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
import errorHandler from '../utils/errors/err-handler';
import { TYPES } from '../inversify-types';
import { SignupForm, schema as signupSchema } from '../utils/schemas/signup';
import { schema as loginSchema } from '../utils/schemas/login';
import type { Request, Response } from 'express';
import { type IUsersRepository } from '../repos/users';
import { AuthService, type IAuthService } from '../services/auth-service';
import { parseDuration } from '../utils/helpers';
import { RefreshTokenRepository } from '../repos/refresh-token';
import { MongoServerError } from 'mongodb';
import { HttpError } from '../utils/errors/errors';

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

      const [accessToken, refreshToken] = await this.authService.authorize(
        email,
        password,
      );

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: parseDuration(AuthService.JWT_LIFE),
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENC === 'production',
        path: '/refresh',
        maxAge: parseDuration(RefreshTokenRepository.LIFETIME),
      });

      res.status(StatusCodes.NO_CONTENT).end();
    } catch (err) {
      if (err instanceof MongoServerError) {
        if (err.code === 11000) {
          errorHandler(
            new HttpError(
              StatusCodes.CONFLICT,
              'A user with this username/email already exists',
            ),
            req,
            res,
          );
          return;
        }
      }

      errorHandler(err as Error, req, res);
    }
  }

  @httpPost('login')
  async login(@request() req: Request, @response() res: Response) {
    try {
      const { username: email, password } = loginSchema.parse(req.body);

      const [accessToken, refreshToken] = await this.authService.authorize(
        email,
        password,
      );

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: parseDuration(AuthService.JWT_LIFE),
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENC === 'production',
        path: '/refresh',
        maxAge: parseDuration(RefreshTokenRepository.LIFETIME),
      });

      res.status(StatusCodes.NO_CONTENT).end();
    } catch (err) {
      errorHandler(err as Error, req, res);
    }
  }

  private extractJwtFromHeader(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'Authorization header missing or incorrect',
      );
    }

    return authHeader.substring(7);
  }

  @httpGet('authenticate')
  async authenticate(@request() req: Request, @response() res: Response) {
    try {
      const { _id: username, email } = await this.authService.authenticate(
        this.extractJwtFromHeader(req),
      );

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
  async logout(
    @queryParam('refreshToken') refreshToken: string,
    @request() req: Request,
    @response() res: Response,
  ) {
    let accessToken: string | undefined;
    try {
      accessToken = this.extractJwtFromHeader(req);
    } catch (e) {}

    try {
      await this.authService.revokeTokens(refreshToken, accessToken);

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'token was revoked',
      });
    } catch (err) {
      errorHandler(err as Error, null, res);
    }
  }

  @httpGet('refresh')
  async refresh(
    @queryParam('refreshToken') refreshToken: string,
    @response() res: Response,
  ) {
    try {
      const accessToken =
        await this.authService.refreshAccessToken(refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: parseDuration(AuthService.JWT_LIFE),
      });

      res.status(StatusCodes.NO_CONTENT).end();
    } catch (err) {
      errorHandler(err as Error, null, res);
    }
  }
}
