import { container } from './inversify-config';
import { InversifyExpressServer } from 'inversify-express-utils';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import './routes/home';

const server = new InversifyExpressServer(container)
  .setConfig(app => {
    app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(cors());
  })
  .build();

const port = Number(process.env.PORT || '3000');

server.listen(port, () =>
  console.log(`Server is listening at http://localhost:${port}`),
);
