import './style.css';
import { APP_NAME, APP_VERSION } from './config';

const root = document.getElementById('app')!;
root.textContent = `${APP_NAME} v${APP_VERSION}`;
