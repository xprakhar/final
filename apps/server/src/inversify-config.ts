import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './inversify-types';
import { MongoDBConnection } from './utils/mongo';
import { IUsersRepository, UsersRepository } from './repos/users';
import { IKeysRepository, KeysRepository } from './repos/auth-keys';
import { AuthService, IAuthService } from './services/auth-service';
import {
  IRefreshTokenRepository,
  RefreshTokenRepository,
} from './repos/refresh-token';
import {
  ITokenBlacklistRepository,
  TokenBlacklistRepository,
} from './repos/token-blacklist';

const container = new Container();

container.bind<MongoDBConnection>(TYPES.MongoDBConn).to(MongoDBConnection);
container.bind<IUsersRepository>(TYPES.UserRepo).to(UsersRepository);
container.bind<IKeysRepository>(TYPES.KeysRepo).to(KeysRepository);
container
  .bind<IRefreshTokenRepository>(TYPES.RefreshTokenRepo)
  .to(RefreshTokenRepository);
container
  .bind<ITokenBlacklistRepository>(TYPES.TokenBlacklistRepo)
  .to(TokenBlacklistRepository);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

export { container };
