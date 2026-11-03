import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({allowedHosts:(process.env['SSR_ALLOWED_HOSTS']??'localhost,127.0.0.1').split(',').map(host=>host.trim()).filter(Boolean)});
// API must reach NestJS, never Angular's HTML fallback. Preserve cookies and browser Origin.
app.use('/api', (req,res)=>{
  const target=new URL(req.originalUrl,process.env['BACKEND_ORIGIN']??'http://127.0.0.1:3000');
  const request=target.protocol==='https:'?httpsRequest:httpRequest;
  const upstream=request(target,{method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
  upstream.setTimeout(15000,()=>upstream.destroy(new Error('API timeout')));
  upstream.on('error',()=>{if(!res.headersSent)res.status(502).json({message:'Không kết nối được Backend.'});else res.end();});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (response, filePath) => {
      if (/\/(ngsw-worker\.js|ngsw\.json|safety-worker\.js)$/.test(filePath.replaceAll('\\', '/'))) {
        response.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
