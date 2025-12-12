# Bolt Clone - AI-Powered Website Builder

A full-stack web application that generates complete websites from natural language prompts using Google's Gemini AI. This is a clone of the popular Bolt.new platform, featuring real-time code generation, live preview, and an integrated development environment.

## 🚀 Features

- **AI-Powered Code Generation**: Generate complete web applications from simple text prompts
- **Live Preview**: Real-time preview of generated websites using WebContainer technology
- **Interactive Code Editor**: Browse and view generated files with syntax highlighting
- **Project Type Detection**: Automatically determines whether to create React or Node.js projects
- **Real-time Collaboration**: Chat with AI to iteratively improve your generated code
- **Professional Error Handling**: Graceful handling of API rate limits and errors
- **Responsive Design**: Modern, dark-themed UI built with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API communication
- **WebContainer API** - Browser-based Node.js runtime for live previews
- **Monaco Editor** - VS Code-like code editor (via @monaco-editor/react)

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Google Generative AI** - Gemini AI integration for code generation
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Development Tools
- **ESLint** - Code linting and quality
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Autoprefixer** - CSS vendor prefixing
- **PostCSS** - CSS processing

## 📁 Project Structure

```
bolt.newer/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── CodeEditor.tsx      # Code viewing component
│   │   │   ├── FileExplorer.tsx    # File tree navigation
│   │   │   ├── FileViewer.tsx      # Individual file viewer
│   │   │   ├── Loader.tsx          # Loading spinner
│   │   │   ├── PreviewFrame.tsx    # WebContainer preview
│   │   │   ├── StepsList.tsx       # Build steps display
│   │   │   └── TabView.tsx         # Code/Preview tabs
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useWebContainer.ts  # WebContainer management
│   │   ├── pages/           # Main application pages
│   │   │   ├── Builder.tsx         # Main builder interface
│   │   │   └── Home.tsx            # Landing page
│   │   ├── types/           # TypeScript type definitions
│   │   │   └── index.ts            # Shared types
│   │   ├── config.ts        # Configuration constants
│   │   ├── steps.ts         # XML parsing for AI responses
│   │   └── main.tsx         # Application entry point
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── vite.config.ts       # Vite build configuration
├── be/                      # Express.js backend
│   ├── src/
│   │   ├── defaults/        # Default project templates
│   │   │   ├── node.ts             # Node.js project template
│   │   │   └── react.ts            # React project template
│   │   ├── constants.ts     # Backend constants
│   │   ├── index.ts         # Main server file
│   │   ├── prompts.ts       # AI system prompts
│   │   └── stripindents.ts  # String formatting utility
│   ├── .env                 # Environment variables (not in repo)
│   ├── .env.example         # Environment variables template
│   ├── package.json         # Backend dependencies
│   └── tsconfig.json        # TypeScript configuration
└── README.md               # This file
```

## 🚦 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google AI Studio API Key** (Gemini)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bolt.newer
   ```

2. **Install backend dependencies**
   ```bash
   cd be
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd ../be
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it in your `.env` file

### Running the Application

1. **Start the backend server**
   ```bash
   cd be
   npm run dev
   ```
   Backend will run on `http://localhost:3001`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173` to use the application

## 🎯 How It Works

### 1. Project Type Detection
When you enter a prompt, the system first determines whether to create a React or Node.js project using the `/template` endpoint.

### 2. Code Generation
The AI generates code using the `/chat` endpoint, which:
- Takes your prompt and conversation history
- Uses Gemini AI to generate structured code responses
- Returns code in `boltArtifact` XML format

### 3. File Processing
The frontend parses the AI response to extract:
- File creation steps
- Shell commands
- Project structure

### 4. WebContainer Integration
Generated files are mounted to WebContainer, which:
- Runs a complete Node.js environment in the browser
- Installs npm dependencies
- Starts development servers
- Provides live preview

### 5. Live Preview
The preview system:
- Automatically detects when files are ready
- Starts the appropriate development server
- Displays the running application in an iframe
- Handles errors and provides fallbacks

## 🔧 Key Components

### Frontend Components

#### `Builder.tsx`
The main application interface that orchestrates:
- AI communication
- File management
- WebContainer integration
- UI state management

#### `PreviewFrame.tsx`
Manages the live preview functionality:
- WebContainer lifecycle
- Development server startup
- Error handling and fallbacks
- Static HTML preview as backup

#### `useWebContainer.ts`
Custom hook that implements:
- Singleton WebContainer instance
- Proper initialization and cleanup
- Error handling and recovery

#### `steps.ts`
XML parser that converts AI responses into actionable steps:
- Extracts file creation commands
- Parses shell commands
- Structures project build steps

### Backend Endpoints

#### `POST /template`
Determines project type (React/Node.js) based on user prompt:
- Uses Gemini AI for classification
- Returns appropriate project templates
- Provides base prompts for code generation

#### `POST /chat`
Handles code generation requests:
- Processes conversation history
- Generates structured code responses
- Implements rate limiting and error handling

## 🛡️ Error Handling

### Rate Limiting
- Detects API quota exceeded (429 errors)
- Shows countdown timer for retry
- Disables UI during rate limit periods
- Automatic recovery when limits reset

### WebContainer Errors
- Singleton pattern prevents multiple instances
- Graceful fallback to static HTML preview
- Retry mechanisms for failed operations
- Clear error messages and recovery options

### Network Errors
- Comprehensive error catching
- User-friendly error messages
- Automatic retry suggestions
- Proper loading states

## 🎨 UI/UX Features

### Modern Interface
- Dark theme with professional styling
- Responsive design for all screen sizes
- Intuitive navigation and controls
- Real-time status indicators

### Developer Experience
- Syntax-highlighted code viewing
- File tree navigation
- Live preview with hot reloading
- Error boundaries and fallbacks

### Performance
- Optimized bundle splitting
- Lazy loading of components
- Efficient WebContainer management
- Minimal re-renders

## 🔒 Security Features

### CORS Configuration
- Proper cross-origin headers
- WebContainer security requirements
- API endpoint protection

### Environment Variables
- Secure API key management
- No sensitive data in client code
- Environment-specific configurations

## 📊 API Integration

### Gemini AI Models
- Uses `models/gemini-flash-latest` for optimal performance
- Handles model availability and fallbacks
- Implements proper retry logic

### Request Optimization
- Efficient prompt engineering
- Conversation context management
- Response parsing and validation

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to any static hosting service:
```bash
cd frontend
npm run build
# Deploy the 'dist' folder
```

### Backend Deployment
The backend can be deployed to any Node.js hosting service:
```bash
cd be
npm run build  # If you add a build script
# Deploy with your preferred service
```

### Environment Configuration
Ensure these environment variables are set in production:
- `GEMINI_API_KEY`: Your Google AI Studio API key
- `PORT`: Server port (defaults to 3001)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the package.json files for details.

## 🙏 Acknowledgments

- **Bolt.new** - Original inspiration for this project
- **Google AI** - Gemini AI API for code generation
- **StackBlitz** - WebContainer technology for browser-based development
- **Vercel** - Inspiration for modern developer tools

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your Gemini API key is valid
3. Ensure both frontend and backend are running
4. Check the rate limiting status in the UI

For additional help, please open an issue in the repository.

---

**Built with ❤️ using modern web technologies**