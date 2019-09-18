const express = require('express'),
    fs = require('fs'),
    request = require('request'),
    compression = require('compression'),
    MobileDetect = require('mobile-detect'),
    _ = require('lodash'),
    path = require('path'),
    envHelper = require('../helpers/environmentVariablesHelper.js'),
    experimentHelper = require('../helpers/experimentationHelper'),
    tenantHelper = require('../helpers/tenantHelper.js'),
    logger = require('sb_logger_util_v2'),
    defaultTenantIndexStatus = tenantHelper.getDefaultTenantIndexState(),
    oneDayMS = 86400000,
    pathMap = {},
    cdnIndexFileExist = fs.existsSync(path.join(__dirname, '../dist', 'index_cdn.ejs')),
    proxyUtils = require('../proxy/proxyUtils.js'),
    bodyParser = require('body-parser'),
    ejs = require('ejs'),
    requestPromise = require('request-promise');

logger.info({ msg: `CDN index file exist: ${cdnIndexFileExist}` });

const setZipConfig = (req, res, type, encoding, dist = '../') => {
    if (pathMap[req.path + type] && pathMap[req.path + type] === 'notExist') {
        return false;
    }
    if (pathMap[req.path + '.' + type] === 'exist' ||
        fs.existsSync(path.join(__dirname, dist) + req.path + '.' + type)) {
        if (req.path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        } else if (req.path.endsWith('.js')) {
            res.set('Content-Type', 'text/javascript');
        }
        req.url = req.url + '.' + type;
        res.set('Content-Encoding', encoding);
        pathMap[req.path + type] = 'exist';
        return true
    } else {
        pathMap[req.path + type] = 'notExist';
        logger.info({
            msg: 'zip file not exist',
            additionalInfo: {
                url: req.url,
                type: type
            }
        })
        return false;
    }
}
module.exports = (app, keycloak) => {

    app.set('view engine', 'ejs')

    app.get(['*.js', '*.css'], (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=' + oneDayMS * 30)
        res.setHeader('Expires', new Date(Date.now() + oneDayMS * 30).toUTCString())
        if (req.get('Accept-Encoding') && req.get('Accept-Encoding').includes('br')) { // send br files
            if (!setZipConfig(req, res, 'br', 'br') && req.get('Accept-Encoding').includes('gzip')) {
                setZipConfig(req, res, 'gz', 'gzip') // send gzip if br file not found
            }
        } else if (req.get('Accept-Encoding') && req.get('Accept-Encoding').includes('gzip')) {
            setZipConfig(req, res, 'gz', 'gzip')
        }
        next();
    });

    app.get(['/dist/*.ttf', '/dist/*.woff2', '/dist/*.woff', '/dist/*.eot', '/dist/*.svg',
        '/*.ttf', '/*.woff2', '/*.woff', '/*.eot', '/*.svg', '/*.html'], compression(),
        (req, res, next) => {
            res.setHeader('Cache-Control', 'public, max-age=' + oneDayMS * 30)
            res.setHeader('Expires', new Date(Date.now() + oneDayMS * 30).toUTCString())
            next()
        })

    app.use(express.static(path.join(__dirname, '../dist'), { extensions: ['ejs'], index: false }))

    app.use('/dist', express.static(path.join(__dirname, '../dist'), { extensions: ['ejs'], index: false }))

    app.use(express.static(path.join(__dirname, `../${envHelper.sunbird_experiment_base_url}`), { extensions: ['ejs'], index: false }))
    app.use('/experiment', express.static(path.join(__dirname, `../${envHelper.sunbird_experiment_base_url}`), { extensions: ['ejs'], index: false }))
    
    app.use(express.static(path.join(__dirname, '../tenant'), { index: false }))

    app.use('/sunbird-plugins', express.static(path.join(__dirname, '../sunbird-plugins')))

    app.use('/tenant', express.static(path.join(__dirname, '../tenant'), { index: false }))

    if (envHelper.DEFAULT_CHANNEL) {
        app.use(express.static(path.join(__dirname, '../tenant', envHelper.DEFAULT_CHANNEL)))
    }

    app.get('/assets/images/*', (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=' + oneDayMS)
        res.setHeader('Expires', new Date(Date.now() + oneDayMS).toUTCString())
        next()
    })

    app.post('/experiment', bodyParser.urlencoded({ extended: false }),
        bodyParser.json({ limit: '50mb' }), async (req, res) => {
            const requestBody = _.get(req, 'body');
            const experimentDetails = await experimentHelper.registerDeviceId(_.get(requestBody, 'did'), _.get(requestBody, 'uaspec'));
            if (_.get(experimentDetails, 'responseCode') === 'OK') {
                let reload = false;
                if (_.get(experimentDetails, 'result.actions') && _.get(experimentDetails, 'result.actions').length > 0) {
                    const experiment = _.find(_.get(experimentDetails, 'result.actions'), action => _.get(action, 'type') === 'experiment');
                    if (experiment) {
                        const isExperimentPathExists = fs.existsSync(path.join(__dirname, `../${envHelper.sunbird_experiment_base_url}`));
                        if (isExperimentPathExists) {
                            req.session.experimentId = _.get(experiment, 'data.id');
                            reload = true;
                        }
                    }
                }
                if (reload) {
                    experimentDetails.result.reload = reload;
                }
                res.status(200).json(experimentDetails);
            } else {
                res.status(500).json(experimentDetails);
            }
        })

    app.all(['/', '/get', '/:slug/get', '/:slug/get/dial/:dialCode', '/get/dial/:dialCode', '/explore',
        '/explore/*', '/:slug/explore', '/:slug/explore/*', '/play/*', '/explore-course', '/explore-course/*',
        '/:slug/explore-course', '/:slug/explore-course/*', '/:slug/signup', '/signup', '/:slug/sign-in/*',
        '/sign-in/*', '/download/*', '/accountMerge/*', '/:slug/download/*', '/certs/*', '/recover/*'], checkForExperimentApp(app), redirectTologgedInPage, indexPage(false))

    app.all(['*/dial/:dialCode', '/dial/:dialCode'], (req, res) => res.redirect('/get/dial/' + req.params.dialCode + '?source=scan'))

    app.all('/app', (req, res) => res.redirect(envHelper.ANDROID_APP_URL))

    app.all(['/announcement', '/announcement/*', '/search', '/search/*',
        '/orgType', '/orgType/*', '/dashBoard', '/dashBoard/*',
        '/workspace', '/workspace/*', '/profile', '/profile/*', '/learn', '/learn/*', '/resources',
        '/resources/*', '/myActivity', '/myActivity/*'], keycloak.protect(), checkForExperimentApp(app), indexPage(true))

    app.all('/:tenantName', renderTenantPage)
}

function getLocals(req) {
    var locals = {}
    if (req.includeUserDetail) {
        locals.userId = _.get(req, 'session.userId') ? req.session.userId : null
        locals.sessionId = _.get(req, 'sessionID') && _.get(req, 'session.userId') ? req.sessionID : null
    } else {
        locals.userId = null
        locals.sessionId = null
    }
    locals.expId = _.get(req, 'experimentId') || null
    locals.cdnUrl = envHelper.PORTAL_CDN_URL
    locals.theme = envHelper.sunbird_theme
    locals.defaultPortalLanguage = envHelper.sunbird_default_language
    locals.instance = process.env.sunbird_instance
    locals.appId = envHelper.APPID
    locals.defaultTenant = envHelper.DEFAULT_CHANNEL
    locals.exploreButtonVisibility = envHelper.sunbird_explore_button_visibility
    locals.helpLinkVisibility = envHelper.sunbird_help_link_visibility
    locals.defaultTenantIndexStatus = defaultTenantIndexStatus
    locals.extContWhitelistedDomains = envHelper.sunbird_extcont_whitelisted_domains
    locals.buildNumber = envHelper.BUILD_NUMBER
    locals.apiCacheTtl = envHelper.PORTAL_API_CACHE_TTL
    locals.cloudStorageUrls = envHelper.CLOUD_STORAGE_URLS
    locals.userUploadRefLink = envHelper.sunbird_portal_user_upload_ref_link
    locals.deviceRegisterApi = envHelper.DEVICE_REGISTER_API
    locals.googleCaptchaSiteKey = envHelper.sunbird_google_captcha_site_key
    locals.videoMaxSize = envHelper.sunbird_portal_video_max_size
    locals.reportsLocation = envHelper.sunbird_azure_report_container_name
    locals.previewCdnUrl = envHelper.sunbird_portal_preview_cdn_url
    locals.offlineDesktopAppTenant = envHelper.sunbird_portal_offline_tenant
    locals.offlineDesktopAppVersion = envHelper.sunbird_portal_offline_app_version
    locals.offlineDesktopAppReleaseDate = envHelper.sunbird_portal_offline_app_release_date
    locals.offlineDesktopAppSupportedLanguage = envHelper.sunbird_portal_offline_supported_languages,
        locals.offlineDesktopAppDownloadUrl = envHelper.sunbird_portal_offline_app_download_url
    locals.logFingerprintDetails = envHelper.LOG_FINGERPRINT_DETAILS,
        locals.deviceId = '';
    return locals
}

const indexPage = (loggedInRoute) => {
    return async (req, res) => {
        if (envHelper.DEFAULT_CHANNEL && req.path === '/') {
            renderTenantPage(req, res)
        } else {
            req.includeUserDetail = true
            if (!loggedInRoute) { // for public route, if user token is valid then send user details
                await proxyUtils.validateUserToken(req, res).catch(err => req.includeUserDetail = false)
            }
            renderDefaultIndexPage(req, res)
        }
    }
}

const renderDefaultIndexPage = (req, res) => {
    const mobileDetect = new MobileDetect(req.headers['user-agent'])
    if ((req.path == '/get' || req.path == `/${req.params.slug}/get`) && mobileDetect.os() == 'AndroidOS') {
        res.redirect(envHelper.ANDROID_APP_URL)
    } else {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0')
        res.locals = getLocals(req);
        logger.info({
            msg: 'cdn parameters:',
            additionalInfo: {
                PORTAL_CDN_URL: envHelper.PORTAL_CDN_URL,
                cdnIndexFileExist: cdnIndexFileExist,
                cdnFailedCookies: req.cookies.cdnFailed
            }
        })
        if (envHelper.PORTAL_CDN_URL && cdnIndexFileExist && req.cookies.cdnFailed !== 'yes') { // assume cdn works and send cdn ejs file
            res.locals.cdnWorking = 'yes';
            res.render(path.join(__dirname, '../dist', 'index_cdn.ejs'))
        } else { // load local file if cdn fails or cdn is not enabled
            if (req.cookies.cdnFailed === 'yes') {
                logger.info({
                    msg: 'CDN Failed - loading local files',
                    additionalInfo: {
                        cdnIndexFileExist: cdnIndexFileExist,
                        PORTAL_CDN_URL: envHelper.PORTAL_CDN_URL
                    }
                })
            }
            res.locals.cdnWorking = 'no';
            res.render(path.join(__dirname, '../dist', 'index.ejs'))
        }
    }
}
// renders tenant page from cdn or from local files based on tenantCdnUrl exists
const renderTenantPage = (req, res) => {
    const tenantName = _.lowerCase(req.params.tenantName) || envHelper.DEFAULT_CHANNEL
    if (req.query.cdnFailed === 'true') {
        loadTenantFromLocal(req, res)
        return;
    }
    if (envHelper.TENANT_CDN_URL) {
        request(`${envHelper.TENANT_CDN_URL}/${tenantName}/index.html`, (error, response, body) => {
            if (error || !body || response.statusCode !== 200) {
                loadTenantFromLocal(req, res)
            } else {
                res.send(body)
            }
        })
    } else {
        loadTenantFromLocal(req, res)
    }
}
// in fallback option check always for local tenant folder and redirect to / if not exists
const loadTenantFromLocal = (req, res) => {
    const tenantName = _.lowerCase(req.params.tenantName) || envHelper.DEFAULT_CHANNEL
    if (tenantName && fs.existsSync(path.join(__dirname, './../tenant', tenantName, 'index.html'))) {
        res.sendFile(path.join(__dirname, './../tenant', tenantName, 'index.html'))
    } else {
        renderDefaultIndexPage(req, res)
    }
}
const redirectTologgedInPage = (req, res) => {
    let redirectRoutes = { '/explore': '/resources', '/explore/1': '/search/Library/1', '/explore-course': '/learn', '/explore-course/1': '/search/Courses/1' };
    if (req.params.slug) {
        redirectRoutes = {
            [`/${req.params.slug}/explore`]: '/resources',
            [`/${req.params.slug}/explore-course`]: '/learn'
        }
    }
    if (_.get(req, 'sessionID') && _.get(req, 'session.userId')) {
        if (_.get(redirectRoutes, req.originalUrl)) {
            const routes = _.get(redirectRoutes, req.originalUrl);
            res.redirect(routes)
        } else {
            if (_.get(redirectRoutes, `/${req.originalUrl.split('/')[1]}`)) {
                const routes = _.get(redirectRoutes, `/${req.originalUrl.split('/')[1]}`);
                res.redirect(routes)
            } else {
                renderDefaultIndexPage(req, res)
            }
        }
    } else {
        renderDefaultIndexPage(req, res)
    }
}

const checkForExperimentApp = (app) => {
    return (req, res, next) => {
        const experimentId = _.get(req, 'session.experimentId');
        if (experimentId) {

            const isExperimentPathExists = fs.existsSync(path.join(__dirname, `../${envHelper.sunbird_experiment_base_url}`));
            req.session.experimentId = null;
            if (isExperimentPathExists) {
                req.experimentId = experimentId;
                req.includeUserDetail = false;
                if (_.get(req, 'sessionID') && _.get(req, 'session.userId')) {
                    req.includeUserDetail = true;
                }
                res.locals = getLocals(req);
                res.locals.cdnWorking = 'no';
                res.render(path.join(__dirname, `../${envHelper.sunbird_experiment_base_url}`, 'index.ejs'));
            }
        } else {
            next();
        }
    }
}

