/* eslint-env node */
import path from 'path';
import jsonServer from 'json-server';

const server = jsonServer.create();
const router = jsonServer.router(path.join('dist', 'db', 'app.json'));
const middlewares = jsonServer.defaults({
	static: 'dist',
	noCors: true,
});
const port = process.env.PORT || 80;

server.use(middlewares);
server.use(router);

server.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

export default server;
