import { container } from './inversify-config';
import { InversifyExpressServer } from 'inversify-express-utils';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import './routes/home';

const server = new InversifyExpressServer(container)
  .setConfig(app => {
    app.use(morgan('dev'));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
  })
  .build();

const port = Number(process.env.PORT || '3000');

server.listen(port, () =>
  console.log(`Server is listening at http://localhost:${port}`),
);
