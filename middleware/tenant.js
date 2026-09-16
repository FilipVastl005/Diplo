const { BASE_DOMAIN = 'diplo.eggmanstudios.me' } = process.env;

module.exports = function tenantMiddleware(req, res, next) {
    const hostname = req.hostname; // Express parses this correctly thanks to 'trust proxy'
    
    // Check if it matches the apex domain exactly
    if (hostname === BASE_DOMAIN || hostname === 'localhost') {
        req.isApex = true;
        return next();
    }
    
    // Check for subdomain
    const suffix = '.' + BASE_DOMAIN;
    if (hostname.endsWith(suffix)) {
        req.tenant = hostname.slice(0, -suffix.length);
        req.isApex = false;
        return next();
    }
    
    // Handle localhost subdomains (e.g., school-a.localhost)
    if (hostname.endsWith('.localhost')) {
        req.tenant = hostname.slice(0, -'.localhost'.length);
        req.isApex = false;
        return next();
    }

    // Fallback: assume apex or unmapped
    req.isApex = true;
    next();
};
