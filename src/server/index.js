import express from 'express';
import useRouter from './router/ai.js';
import cors from 'cors';

const app = express();

//跨域解决
app.use(cors());
app.use(express.json());
//路由挂载
app.use(useRouter);

//启动web服务
app.listen(8080, () => {
  console.log('http://localhost:8080');
});
