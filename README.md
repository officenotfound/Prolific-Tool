<div align="center">

# 🎯 Prolific Tool

### Enhanced Study Notifications & Dark Mode for Prolific

[![GitHub Stars](https://img.shields.io/github/stars/officenotfound/ProlificTool?style=for-the-badge&logo=github)](https://github.com/officenotfound/ProlificTool)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Coming_Soon-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](#)
[![Firefox](https://img.shields.io/badge/Firefox-Coming_Soon-FF7139?style=for-the-badge&logo=firefox&logoColor=white)](#)

**Never miss a study opportunity on [Prolific](https://app.prolific.com/)!**

[Features](#-features) • [Installation](#-installation) • [Screenshots](#-screenshots) • [Support](#-support)

<img src="imgs/logo.png" alt="Prolific Tool Logo" width="128" height="128">

</div>

---

## ✨ Features

### 🌙 **Dark Mode**
- Beautiful dark theme for the Prolific website
- Easy toggle from extension popup
- Reduces eye strain during late-night study sessions
- Persistent across browser sessions

### ⚙️ **Smart Auto-Refresh**
- **Opt-in design** - Auto-refresh is disabled by default
- Configurable refresh intervals (15-60 seconds)
- Random refresh option to vary timing
- Respects your preferences and only runs when enabled

### 🔔 **Customizable Notifications**
- Real-time alerts when new studies become available
- Multiple notification sound options
- Desktop notifications with study details
- Auto-focus Prolific tab when studies appear (optional)

### 📊 **Study Management**
- View all available studies in one place
- Search and filter by title or researcher
- Sort by pay rate, time, or creation date
- Track total earnings potential
- Download study data as CSV

### 🎨 **Modern Interface**
- Clean Material Design UI
- Intuitive settings management
- Built-in FAQ section
- Fast and responsive

---

## 🚀 Installation

> **Note**: Chrome Web Store and Firefox Add-ons listings are currently in review. Manual installation is available now.

### Manual Installation

#### Chrome
1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `chrome` folder from this repository
6. Pin the extension to your toolbar
7. Open [Prolific](https://app.prolific.com/) and enjoy!

#### Firefox
1. Download or clone this repository
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on**
4. Select any file in the `firefox` folder
5. Pin the extension to your toolbar
6. Open [Prolific](https://app.prolific.com/) and enjoy!

---

## 📖 How to Use

### Initial Setup

1. **Enable Notifications**  
   Make sure notifications are enabled in both your browser AND system settings for the best experience.

   | Chrome Notifications | System Notifications |
   |---------------------|---------------------|
   | ![Chrome Notifications](Screenshots/Chrome%20Notifications.jpg) | ![System Notifications](Screenshots/System%20Notifications.jpg) |

2. **Configure Your Preferences**  
   Open the extension popup and customize:
   - 🌙 **Dark Mode** - Toggle the dark theme
   - ⚙️ **Enable Auto Refresh** - Turn on automatic study checking
   - ⏱️ **Refresh Interval** - Set how often to check (15-60s)
   - 🔊 **Notification Sound** - Choose your preferred alert
   - 🔔 **Show Notifications** - Enable/disable desktop alerts

3. **Pin the Extension**  
   Click the puzzle icon in your browser toolbar and pin Prolific Tool for quick access.

### How It Works

The extension monitors your Prolific tab for new studies. When enabled and a study becomes available:

1. 🔔 You receive a desktop notification
2. 🔊 An audio alert plays (if enabled)
3. 🎯 The Prolific tab auto-focuses (if enabled)
4. 📋 Study details appear in the extension popup

> **Important**: Keep a Prolific tab open for notifications to work.

---

## 🎛️ Settings Overview

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Auto Refresh** | Automatically check for new studies | ❌ Disabled |
| **Refresh Interval** | How often to check (seconds) | 60s |
| **Randomize Refresh** | Use random intervals (15-60s) | ❌ Off |
| **Show Notifications** | Display desktop notifications | ✅ Enabled |
| **Play Sound** | Audio alert for new studies | ✅ Enabled |
| **Focus Tab** | Auto-switch to Prolific tab | ❌ Off |
| **Dark Mode** | Dark theme for Prolific website | ❌ Off |
| **Minimum Pay Rate** | Filter studies by minimum pay | £0.00/hr |

---

## 📸 Screenshots

<div align="center">

### Extension Popup Interface
*Modern Material Design UI with easy access to all features*

### Dark Mode
*Comfortable dark theme for the Prolific website*

### Study Management
*View, search, and filter available studies*

</div>

---

## 💡 Pro Tips

- 🎯 **Pin the extension** to your toolbar for instant access
- 🌙 **Enable Dark Mode** for comfortable late-night study hunting
- 🔄 **Use Random Refresh** to vary your polling intervals
- 📊 **Download CSV** to track your study history and earnings
- 🔕 **Disable Auto-Refresh** when you're not actively looking for studies to save resources

---

## ❤️ Support This Project

If you find Prolific Tool helpful, consider supporting its development:

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-Support_Development-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/404officenotfound)

**⭐ Star this repo** • **🐛 Report bugs** • **💡 Suggest features**

</div>

Your support helps keep this tool free and actively maintained!

---

## 🛠️ Tech Stack

- **Manifest V3** (Chrome) / **Manifest V2** (Firefox)
- TypeScript
- Material Design CSS
- Chrome/Firefox Extension APIs
- Modern ES6+ JavaScript

---

## 📝 Changelog

### Version 3.1.1 (Current)
- ✨ Added Dark Mode for Prolific website
- 🎛️ Auto-refresh now opt-in (disabled by default)
- 🎨 Redesigned UI with Material Design
- 📊 Enhanced study search and filtering
- 🐛 Bug fixes and performance improvements
- 🔄 Renamed from "Prolific Studies Notifier" to "Prolific Tool"

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🎉 Open a Pull Request

---

## 📧 Contact

**Developer**: 404: Office Not Found  
**Email**: [404officenotfound@gmail.com](mailto:404officenotfound@gmail.com)  
**X (Twitter)**: [@404office](https://x.com/404office)  
**GitHub**: [@officenotfound](https://github.com/officenotfound)

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by Prolific. It is an independent tool created to enhance the user experience for Prolific participants.

---

<div align="center">

**Made with ❤️ for the Prolific community**

If this tool helps you earn more on Prolific, consider [buying me a coffee](https://buymeacoffee.com/404officenotfound)! ☕

[⬆ Back to Top](#-prolific-tool)

</div>