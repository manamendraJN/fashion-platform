# Fashion Intelligence Platform

AI-powered fashion intelligence platform combining body measurement, size recommendations, wardrobe optimization, garment fitting analysis, accessories coordination, grooming recommendations, and personalized styling.   

## Overview

This project is an **intelligent, AI-driven fashion recommendation platform** designed to deliver personalized, context-aware, and time-adaptive styling suggestions. Unlike traditional fashion recommendation systems that treat user preferences as static, this system captures how personal style evolves over time, considering factors such as seasons, lifestyle changes, occasions, body measurements, and grooming needs.

The system integrates multiple AI modules—including wardrobe learning, body measurement extraction, accessories recommendation, and grooming analysis—to provide a complete and holistic fashion assistance experience.  The solution promotes sustainable fashion, reduces decision fatigue, and improves user confidence in styling and purchase decisions.

## Features

- **Temporal Wardrobe Learning** - Learns how user fashion preferences change over time
- **Personalized Outfit Recommendation** - Context-aware suggestions based on season, event, and usage history
- **Explainable AI** - Clear, human-readable reasons behind each recommendation
- **Body Measurement & Fit Prediction** - AI-based size recommendations across multiple brands
- **Accessories Recommendation** - Occasion-aware and budget-conscious accessory suggestions
- **Integrated Grooming Analysis** - Holistic styling support including hair, skin, nails, and dental care
- **Analytics Dashboard** - Insights into wardrobe usage, missing items, and sustainability trends

## Objectives

### Main Objective

To develop an intelligent fashion recommendation system that adapts to temporal changes in user preferences and delivers explainable, personalized outfit and styling recommendations.

### Specific Objectives

- Model the evolution of personal style over time using deep learning techniques
- Provide accurate outfit recommendations based on wardrobe images, seasons, and user behavior
- Extract body measurements from user images to recommend correct garment sizes with justification
- Recommend accessories based on occasion, budget, and cultural context
- Offer integrated grooming recommendations covering hair, skin, nails, and hygiene
- Promote wardrobe-first reuse to support sustainable fashion practices

## Tech Stack

### Backend
- **Framework**: Flask 3.0
- **ML/AI**: PyTorch 2.0, timm, HuggingFace Hub
- **Image Processing**: OpenCV, Pillow, albumentations, rembg
- **Deployment**: Gunicorn (production)

### Frontend
- **Framework**:  React 18.2
- **Build Tool**: Vite 4.4
- **Styling**: Tailwind CSS 4.0
- **HTTP Client**: Axios 1.5
- **Icons**: Lucide React 0.263
- **Dev Server**: Hot Module Replacement (HMR)

### Database & Cloud
- **Database**: PostgreSQL, MongoDB
- **Cloud**: AWS / Azure / GCP

## Project Structure

```
fashion-intelligence-platform/
├── backend/                    # Backend API services
│   ├── app.py                 # Main application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── core/                  # Core configuration
│   │   └── config.py
│   ├── models/                # ML model files
│   ├── routes/                # API route blueprints
│   │   ├── analysis_routes.py
│   │   ├── model_routes.py
│   │   └── general_routes.py
│   ├── services/              # Business logic
│   │   ├── hf_service.py      # HuggingFace integration
│   │   ├── image_service.py   # Image processing
│   │   └── model_service.py   # Model inference
│   └── utils/                 # Helper functions
│       ├── image_utils.py
│       └── response_utils.py
├── frontend/                  # Frontend React application
│   ├── . gitignore            # Frontend-specific ignore rules
│   ├── package. json          # Node.js dependencies
│   ├── vite.config.js        # Vite build configuration
│   ├── index.html            # HTML entry point
│   ├── README.md             # Frontend documentation
│   └── src/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # Main application component
│       ├── index.css         # Global styles (Tailwind)
│       ├── components/       # React components
│       │   ├── ImageUpload.jsx           # Image upload with drag-drop
│       │   ├── MaskPreview. jsx           # Background removal preview
│       │   ├── MeasurementsDisplay.jsx   # Display 14 measurements
│       │   └── SizeRecommendations.jsx   # Size suggestions UI
│       └── services/
│           └── api.js        # Backend API integration
├── ml_models/                # Machine learning models
│   ├── body_measurement/
│   ├── recommendation/
│   ├── accessories/
│   └── grooming/
├── data/                     # Dataset and training data
├── tests/                    # Unit and integration tests
└── docs/                     # Documentation
```

## Installation

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment** (optional)
   ```bash
   MODEL_NAME=your-model-name
   USE_GPU=True
   FLASK_ENV=development
   ```

4. **Run the server**
   ```bash
   # Development
   python app.py

   # Production
   gunicorn app:app
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env file
   echo "VITE_API_URL=http://localhost:5000" > .env
   ```

4. **Run development server**
   ```bash
   # Development (with HMR)
   npm run dev

   # Build for production
   npm run build

   # Preview production build
   npm run preview
   ```

5. **Access the application**
   ```
   Open browser to http://localhost:5173
   ```

## API Endpoints

### General
- `GET /` - Health check
- `GET /health` - Service health status

### Model Operations
- `GET /models` - List available models
- `POST /models/download` - Download model from HuggingFace

### Body Measurement
- `POST /complete-analysis` - Complete body measurement prediction from image
- `POST /analyze` - Basic measurement analysis endpoint
- `POST /remove-background` - Background removal preprocessing
- `POST /predict-measurements` - Get body measurements
- `POST /get-size-recommendations` - Get clothing size suggestions

### Outfit Recommendation
- `POST /recommend/outfit` - Get personalized outfit recommendations
- `POST /recommend/wardrobe` - Wardrobe-based suggestions

### Accessories
- `POST /recommend/accessories` - Occasion-based accessory recommendations

### Grooming
- `POST /grooming/analyze` - Integrated grooming analysis

## Frontend Features

### Complete User Workflow

1. **Image Upload**
   - Drag-and-drop image upload
   - Front view and side view image inputs
   - File type validation (JPG, PNG)
   - File size validation
   - Image preview before analysis

2. **Background Removal Preview**
   - Side-by-side comparison (before/after)
   - Accept/Retry functionality
   - Visual feedback during processing

3. **Body Measurements Display**
   - 14 body measurements:  
     * Height, Chest, Waist, Hip
     * Shoulder breadth, Arm length, Leg length
     * Bicep, Forearm, Wrist circumferences
     * Thigh, Calf, Ankle circumferences
     * Shoulder-to-crotch length
   - Professional card layout
   - Easy-to-read format

4. **Size Recommendations**
   - Category-specific sizing (Tops, Bottoms, Dresses)
   - Confidence scores (0-100%)
   - Size measurement ranges
   - US size standards (XS, S, M, L, XL, XXL)
   - Gender-specific recommendations

### UI/UX Highlights

- **Modern Design**:  Purple-to-blue gradient theme with indigo accents
- **Responsive Layout**: Mobile-first design with Tailwind CSS
- **Loading States**: Clear feedback during processing
- **Error Handling**: User-friendly error messages
- **Step-by-Step Flow**:  Intuitive progression through workflow
- **Visual Indicators**: Icons and status badges for better UX

## Configuration

### Backend Configuration

Key configurations in `core/config.py`:
- Model directory paths
- CORS origins
- Default model settings
- File upload constraints
- API rate limits

### Frontend Configuration

Environment variables in `.env`:
```bash
VITE_API_URL=http://localhost:5000  # Backend API URL
```

Vite configuration in `vite.config.js`:
- React plugin setup
- Tailwind CSS integration
- Dev server configuration
- Build output settings
- Hot Module Replacement (HMR)

## Dependencies

### Backend Dependencies

Core dependencies:
- **torch** - Deep learning framework
- **flask** - Web framework
- **opencv-python** - Image processing
- **rembg** - Background removal
- **albumentations** - Image augmentation
- **timm** - PyTorch image models
- **huggingface-hub** - Model management

See [backend/requirements.txt](backend/requirements.txt) for complete list.

### Frontend Dependencies

Core dependencies: 
- **react** (^18.2.0) - UI library
- **react-dom** (^18.2.0) - React DOM rendering
- **axios** (^1.5.0) - HTTP client for API calls
- **lucide-react** (^0.263.1) - Icon library
- **tailwindcss** (^4.0.0-beta.4) - Utility-first CSS
- **@tailwindcss/vite** (^4.0.0-beta.4) - Tailwind Vite plugin

Dev dependencies:
- **vite** (^4.4.9) - Build tool and dev server
- **@vitejs/plugin-react** (^4.0.4) - React plugin for Vite

See [frontend/package.json](frontend/package.json) for complete list.

## Platform Preview

<img width="1709" alt="Fashion Intelligence Platform Dashboard" src="https://github.com/user-attachments/assets/ae84f73b-9220-4e20-8bb7-98dc17f8baf2" />

## Development Workflow

### Component Development Order

Frontend components were developed in dependency order: 

```
Phase 1: Project Foundation
├── package.json, vite.config.js, index.html
└── . gitignore (frontend-specific)

Phase 2: Styling Setup
└── src/index.css

Phase 3: API Layer
└── src/services/api.js

Phase 4: UI Components (in dependency order)
├── src/components/ImageUpload.jsx
├── src/components/MaskPreview. jsx
├── src/components/MeasurementsDisplay.jsx
└── src/components/SizeRecommendations.jsx

Phase 5: Application Integration
├── src/App.jsx
└── src/main.jsx

Phase 6: Documentation
└── README.md
```

### Git Commit Strategy

The project follows conventional commits with clear feature separation:

**Backend commits** (19 commits):
- Setup, configuration, and utilities
- Service layer implementation
- API routes and endpoints
- Documentation

**Frontend commits** (13 commits):
- Setup and configuration (5 commits)
- API layer (1 commit)
- UI components (4 commits)
- Integration (2 commits)
- Documentation (1 commit)

**Total**:  32+ commits for complete feature implementation

## Testing

### Backend Testing

```bash
cd backend
pytest tests/
```

### Frontend Testing

```bash
cd frontend
npm run test        # Unit tests (when configured)
npm run test:e2e    # E2E tests (when configured)
```

### Integration Testing

```bash
# Start backend
cd backend && python app.py

# In new terminal, start frontend
cd frontend && npm run dev

# Test complete workflow at http://localhost:5173
```

## Future Enhancements

### Planned Features

1. ✅ Add accessories recommendations module
2. ✅ Add grooming recommendations module
3. ✅ Add user authentication system
4. ✅ Add measurement history tracking
5. ✅ Multi-language support
6. ✅ Brand-specific size mapping
7. ✅ Virtual try-on integration
8. ✅ Social sharing features

### Technical Improvements

1. Add loading animations and transitions
2. Add error boundary component
3. Add unit tests (Jest, React Testing Library)
4. Add E2E tests (Playwright, Cypress)
5. Optimize images and performance
6. Add PWA support for offline functionality
7. Implement caching strategies
8. Add analytics and tracking

## Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check Python version (3.8+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Frontend not starting:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version (16+)
node --version
```

**CORS errors:**
- Verify CORS configuration in `backend/core/config.py`
- Ensure frontend URL is in allowed origins
- Check `VITE_API_URL` in frontend `.env`

**Model download issues:**
- Verify internet connection
- Check HuggingFace Hub status
- Ensure sufficient disk space

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes using conventional commits
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:  feat, fix, docs, style, refactor, test, chore

**Examples**:
```bash
feat(frontend): add image upload component
fix(backend): resolve CORS configuration issue
docs(readme): update installation instructions
```

## License

Part of the Fashion Intelligence Platform project. 

## Author

**manamendraJN**
- GitHub: [@manamendraJN](https://github.com/manamendraJN)

## Contact & Support

For questions, suggestions, or support: 
- 💬 Issues: [GitHub Issues](https://github.com/manamendraJN/fashion-intelligence-platform/issues)
- 📧 Email: your-email@example.com

---

<p align="center">
  Made with ❤️ for sustainable and intelligent fashion
</p>
