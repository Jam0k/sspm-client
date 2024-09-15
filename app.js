// app.js
let auth0Client;

async function initializeAuth0() {
    try {
        auth0Client = await auth0.createAuth0Client({
            domain: config.domain,
            clientId: config.clientId,
            authorizationParams: {
                redirect_uri: window.location.origin,
                audience: config.audience
            },
            cacheLocation: 'localstorage',
            useRefreshTokens: true
        });

        if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        await checkAuthentication();

        document.getElementById('login').addEventListener('click', login);
        document.getElementById('logout').addEventListener('click', logout);
    } catch (error) {
        console.error("Error initializing Auth0:", error);
    }
}

async function checkAuthentication() {
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
            await updateUI();
        } else {
            // Only attempt silent authentication if there's a chance the user is authenticated
            const query = window.location.search;
            if (query.includes("code=") || query.includes("error=")) {
                await auth0Client.getTokenSilently();
                await updateUI();
            } else {
                updateUIUnauthenticated();
            }
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        updateUIUnauthenticated();
    }
}

async function updateUI() {
    const user = await auth0Client.getUser();
    document.getElementById('login').style.display = 'none';
    document.getElementById('logout').style.display = 'block';
    document.getElementById('user-info').innerHTML = `
        <h2>User Information</h2>
        <p>Name: ${escapeHtml(user.name)}</p>
        <p>Email: ${escapeHtml(user.email)}</p>
    `;
    await makeApiCall();
}

function updateUIUnauthenticated() {
    document.getElementById('login').style.display = 'block';
    document.getElementById('logout').style.display = 'none';
    document.getElementById('user-info').innerHTML = '';
}

async function login() {
    await auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: window.location.origin
        }
    });
}

async function logout() {
    await auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
}

async function makeApiCall() {
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            console.log('User is not authenticated. Skipping API call.');
            return;
        }

        const token = await auth0Client.getTokenSilently();
        const response = await fetch(`${config.apiUrl}/api/protected`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API response:', data);
    } catch (error) {
        console.error('API call failed:', error);
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

document.addEventListener('DOMContentLoaded', initializeAuth0);
