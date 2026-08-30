# Project Bootstrap

## Environment Audit (Stage 0)
- **OS**: Windows 11
- **Node.js**: v24.19.0
- **Package Manager**: npm v11.17.0
- **Android SDK**: `AppData\Local\Android\Sdk`
- **Android Studio**: `C:\Program Files\Android\Android Studio`
- **Java/JDK**: OpenJDK 25 (Bundled via Android Studio at `C:/Program Files/Android/Android Studio/jbr`)

## React Native Configuration
- **React Native Version**: 0.87.1
- **Template**: React Native TypeScript default template (Bare workflow)

## Android Configuration
- **Minimum Android Version (minSdkVersion)**: Handled by React Native defaults (typically API 21/24)
- **Target SDK (targetSdkVersion)**: Handled by React Native defaults (typically API 34/35)
- **Gradle**: Controlled by React Native wrapper (typically 8.10.x for RN 0.76+)

## Project Structure
- Follows strict feature-oriented bounds (`src/app`, `src/features`, `src/services`, `src/native`, etc.).
