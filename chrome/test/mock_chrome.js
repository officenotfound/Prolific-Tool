// Mock Chrome API for Testing
window.chrome = {
    storage: {
        sync: {
            data: {},
            get: function (keys, callback) {
                let result = {};
                if (typeof keys === 'string') keys = [keys];
                if (Array.isArray(keys)) {
                    keys.forEach(k => result[k] = this.data[k]);
                } else if (typeof keys === 'object') {
                    for (let k in keys) {
                        result[k] = this.data[k] !== undefined ? this.data[k] : keys[k];
                    }
                } else {
                    result = this.data;
                }
                if (callback) callback(result);
                return Promise.resolve(result);
            },
            set: function (items, callback) {
                for (let k in items) {
                    this.data[k] = items[k];
                }
                if (callback) callback();
                return Promise.resolve();
            }
        },
        local: {
            data: {
                currentStudies: [
                    { id: 'test1', title: 'Test Study 1', researcher: 'Dr. Smith', reward: '£1.50', rewardPerHour: '£9.00', time: '10 min' },
                    { id: 'test2', title: 'Survey on AI', researcher: 'AI Lab', reward: '$2.00', rewardPerHour: '$12.00', time: '10 min' }
                ],
                studyHistory: {
                    studies: [
                        { id: 'hist1', title: 'Old Study', researcher: 'Old Researcher', reward: '£0.50', lastSeen: new Date().toISOString(), completed: false }
                    ]
                }
            },
            get: function (keys, callback) {
                let result = {};
                if (typeof keys === 'string') keys = [keys];
                if (Array.isArray(keys)) {
                    keys.forEach(k => result[k] = this.data[k]);
                } else {
                    result = this.data;
                }
                if (callback) callback(result);
                return Promise.resolve(result);
            },
            set: function (items, callback) {
                for (let k in items) {
                    this.data[k] = items[k];
                }
                if (callback) callback();
                return Promise.resolve();
            }
        }
    },
    tabs: {
        query: function (queryInfo, callback) {
            callback([{ id: 1 }]);
        },
        sendMessage: function (tabId, message, callback) {
            console.log('Mock sendMessage:', message);
            if (callback) callback();
        }
    },
    action: {
        setBadgeText: function (details) {
            console.log('Mock setBadgeText:', details.text);
        }
    },
    runtime: {
        sendMessage: function (message, callback) {
            console.log('Mock runtime.sendMessage:', message);
            if (callback) callback();
            return Promise.resolve();
        }
    }
};
