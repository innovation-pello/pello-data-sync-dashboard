document.addEventListener('DOMContentLoaded', function () {
    const statusSection = document.getElementById('status-section');
    const logsSection = document.getElementById('logs-section');
    const errorMessage = document.getElementById('error-message');

    function showError(message) {
        errorMessage.innerText = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    async function fetchStatus() {
        hideError();

        try {
            const response = await fetch('http://localhost:3000/api/status');
            if (!response.ok) throw new Error('Failed to fetch platform statuses.');

            const data = await response.json();
            console.log('Platform statuses:', data); // Debugging

            statusSection.innerHTML = data.map(platform => {
                const platformId = platform.platform.toLowerCase().trim().replace(/[\s\.]/g, '');

                const authorizeButton = platform.platform === 'Domain.com.au' && platform.status === 'Not Authorized'
                    ? `<button id="authorize-domain" class="bg-yellow-500 text-white py-2 px-4 rounded mt-4">Authorize Domain</button>`
                    : '';

                return `
                    <div class="bg-white shadow-md rounded-lg p-4" id="platform-${platformId}">
                        <h2 class="text-xl font-semibold mb-2">${platform.platform}</h2>
                        <p class="text-gray-600">Last sync: 
                            <span id="last-sync-${platformId}" class="font-medium text-gray-500">
                                ${platform.lastSync || 'N/A'}
                            </span>
                        </p>
                        <p class="text-gray-600">Status: 
                            <span id="status-${platformId}" class="font-medium ${platform.status === 'Connected' ? 'text-green-500' : 'text-red-500'}">
                                ${platform.status}
                            </span>
                        </p>
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mt-4 hidden" id="progress-bar-${platformId}">
                            <div class="bg-blue-500 h-2.5 rounded-full progress-bar" style="width: 0%;"></div>
                        </div>
                        ${authorizeButton}
                        <button id="sync-now-${platformId}" class="bg-blue-500 text-white py-2 px-4 rounded mt-4">
                            Sync Now
                        </button>
                    </div>
                `;
            }).join('');

            attachAuthorizeButtonListener();
            attachSyncButtonListeners();
        } catch (error) {
            showError('Failed to load platform statuses. Please try again.');
            console.error('fetchStatus error:', error);
        }
    }

    async function fetchLogs() {
        hideError();

        try {
            const response = await fetch('http://localhost:3000/api/logs');
            if (!response.ok) throw new Error('Failed to fetch logs.');

            const logs = await response.json();
            logsSection.innerHTML = logs.map(log => `<p>${log}</p>`).join('');
        } catch (error) {
            showError('Failed to load logs. Please try again.');
            console.error('fetchLogs error:', error);
        }
    }

    function attachAuthorizeButtonListener() {
        const authorizeButton = document.getElementById('authorize-domain');
        if (authorizeButton) {
            authorizeButton.addEventListener('click', async () => {
                try {
                    const response = await fetch('http://localhost:3000/api/domain/authorize');
                    const data = await response.json();
                    if (data.authUrl) {
                        const authWindow = window.open(data.authUrl, '_blank');
                        if (!authWindow) {
                            alert('Please allow pop-ups for this website.');
                            return;
                        }
                        showModal('Waiting for Domain Login...', 'Complete the login process in the new tab.');
                    } else {
                        alert('Failed to retrieve authorization URL.');
                    }
                } catch (error) {
                    console.error('Authorization failed:', error);
                    alert('Authorization failed. Please try again.');
                }
            });
        }
    }

    function attachSyncButtonListeners() {
        const syncButtons = document.querySelectorAll('[id^="sync-now-"]');
        syncButtons.forEach(button => {
            button.addEventListener('click', () => {
                const platform = button.id.replace('sync-now-', '');
                console.log(`Attempting sync for platform: ${platform}`);
                syncPlatform(platform);
            });
        });
    }

    window.syncPlatform = function (platform) {
        const endpointMap = {
            realestatecomau: 'realestate',
            domaincomau: 'domain',
        };

        const endpoint = endpointMap[platform];
        if (!endpoint) {
            showError(`No API endpoint for ${platform}`);
            return;
        }

        const progressBarContainer = document.getElementById(`progress-bar-${platform}`);
        const progressBar = progressBarContainer.querySelector('.progress-bar');
        const statusElement = document.getElementById(`status-${platform}`);

        statusElement.textContent = 'Syncing...';
        statusElement.className = 'font-medium text-blue-500';

        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '0%';

        const eventSource = new EventSource(`http://localhost:3000/api/${endpoint}/progress`);

        eventSource.onmessage = function (event) {
            const progress = JSON.parse(event.data);
            const percent = (progress.step / progress.total) * 100;
            progressBar.style.width = `${percent}%`;
            statusElement.textContent = progress.message;

            if (progress.step === progress.total) {
                eventSource.close();
                progressBarContainer.classList.add('hidden');
                statusElement.textContent = 'Connected';
                statusElement.className = 'font-medium text-green-500';

                // Refresh both logs and statuses
                fetchLogs();
                fetchStatus();
            }
        };

        eventSource.onerror = function () {
            eventSource.close();
            showError('Progress updates failed.');
            statusElement.textContent = 'Error';
            statusElement.className = 'font-medium text-red-500';
            progressBarContainer.classList.add('hidden');
        };

        fetch(`http://localhost:3000/api/${endpoint}/sync`, { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    console.error(`Sync request failed for ${endpoint} with status: ${response.status}`);
                    throw new Error(`Sync failed with status ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                console.log(`Sync completed successfully for ${endpoint}`);
                fetchLogs();
            })
            .catch(error => {
                console.error(`Sync failed for platform ${platform}:`, error.message);
                showError(`Sync failed: ${error.message}. Please try again.`);
                statusElement.textContent = 'Error';
                statusElement.className = 'font-medium text-red-500';
            });
    };

    const showModal = (title, message) => {
        const modalContainer = document.createElement('div');
        modalContainer.classList.add('modal', 'fixed', 'z-50', 'inset-0', 'flex', 'items-center', 'justify-center', 'bg-gray-800', 'bg-opacity-50');
        modalContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                <h2 class="text-2xl font-bold mb-4">${title}</h2>
                <p class="text-gray-600">${message}</p>
                <button id="close-modal" class="bg-blue-500 text-white py-2 px-4 rounded mt-4">Close</button>
            </div>
        `;
        document.body.appendChild(modalContainer);
        document.getElementById('close-modal').addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });
    };

    window.addEventListener('message', (event) => {
        if (event.data === 'domainAuthorized') {
            showModal('Authorization Successful', 'Domain.com.au is now connected.');
            fetchStatus();
        }
    });

    fetchStatus();
    fetchLogs();
});