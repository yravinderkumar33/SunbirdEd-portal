import { StartupService } from "./modules/core/services/startup/startup.service";


export function startupServiceFactory(startupService: StartupService): Function {
    return () => startupService.init();
} 