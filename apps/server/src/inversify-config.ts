import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './inversify-types';
import { MongoDBConnection } from './utils/mongo';
import { IUsersRepository, UsersRepository } from './utils/repos/user-repo';
import { IKeysRepository, KeysRepository } from './utils/repos/keys-repo';
import { AuthService, IAuthService } from './services/auth-service';
import {
  IRefreshTokenRepository,
  RefreshTokenRepository,
} from './utils/repos/tokens-repo';

const container = new Container();

container.bind<MongoDBConnection>(TYPES.MongoDBConn).to(MongoDBConnection);
container.bind<IUsersRepository>(TYPES.UserRepo).to(UsersRepository);
container.bind<IKeysRepository>(TYPES.KeysRepo).to(KeysRepository);
container
  .bind<IRefreshTokenRepository>(TYPES.RefreshTokenRepo)
  .to(RefreshTokenRepository);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

export { container };
