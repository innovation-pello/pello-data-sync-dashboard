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
            statusSection.innerHTML = data.map(platform => {
                const platformId = platform.platform.toLowerCase().trim().replace(/[\s\.]/g, '');

                const authorizeButton = platform.platform === 'Domain.com.au'
                    ? `<button id="authorize-domain" class="mt-4"><i class="fa-solid fa-lock text-blue-500 text-xl"></i></button>`
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
                            <span id="status-${platformId}" class="font-medium text-green-500">
                                ${platform.status || 'Pending'}
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
            const uniqueLogs = Array.from(new Set(logs));

            logsSection.innerHTML = uniqueLogs.map(log => `<p>${log}</p>`).join('');
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
                        window.location.href = data.authUrl;
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
        const lastSyncElement = document.getElementById(`last-sync-${platform}`);

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
                    throw new Error(`Sync failed with status ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                fetchLogs();
            })
            .catch(error => {
                console.error(`Sync failed:`, error);
                showError('Sync failed. Please try again.');
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

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('authSuccess')) {
        const authorizeButton = document.getElementById('authorize-domain');
        if (authorizeButton) {
            authorizeButton.innerHTML = `<i class="fa-solid fa-unlock text-green-500 text-xl"></i>`;
        }
        showModal('Authorization Successful', 'You can now sync with Domain.com.au.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchStatus();
    fetchLogs();
});