// @flow

import browserPlugin from './browser';
import serverPlugin from './server';
import getHandlers from './handlers';
import {SWTemplateSourceToken} from './tokens';

export default (__NODE__ ? serverPlugin : browserPlugin);
export {getHandlers, SWTemplateSourceToken};
