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
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Failed to fetch platform statuses.');

            const data = await response.json();
            console.log('Platform statuses:', data);

            statusSection.innerHTML = data.map(platform => {
                const platformId = platform.platform.toLowerCase().trim().replace(/[\s\.]/g, '');

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
                        <button id="sync-now-${platformId}" class="bg-blue-500 text-white py-2 px-4 rounded mt-4">
                            Sync Now
                        </button>
                    </div>
                `;
            }).join('');

            attachSyncButtonListeners();
        } catch (error) {
            showError('Failed to load platform statuses. Please try again.');
            console.error('fetchStatus error:', error);
        }
    }

    async function fetchLogs() {
        hideError();

        try {
            const response = await fetch('/api/logs');
            if (!response.ok) throw new Error('Failed to fetch logs.');

            const logs = await response.json();
            logsSection.innerHTML = logs.map(log => `<p>${log}</p>`).join('');
        } catch (error) {
            showError('Failed to load logs. Please try again.');
            console.error('fetchLogs error:', error);
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

        const eventSource = new EventSource(`/api/${endpoint}/progress`);

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

        fetch(`/api/${endpoint}/sync`, { method: 'POST' })
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

    fetchStatus();
    fetchLogs();
});