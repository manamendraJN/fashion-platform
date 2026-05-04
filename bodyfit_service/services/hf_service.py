import torch
import json
from pathlib import Path
import logging
from huggingface_hub import hf_hub_download

# Import config to get model mappings
try:
    from core.config import Config
    MODEL_FILES = Config.MODEL_FILES
except ImportError:
    # Fallback if config not available
    MODEL_FILES = {
        'model_v1': 'efficientnet-b3_model.pth',
        'model_v2': 'mobilenetv3_model.pth',
        'model_v3': 'resnet50_model.pth',
    }

logger = logging.getLogger(__name__)


class HuggingFaceModelManager:
    """Simple manager for downloading models using version aliases"""
    
    # Hugging Face repository
    HF_REPO_ID = "manamendra/body-measurement-ai"
    
    # All available models
    AVAILABLE_MODELS = {
        'model_v1': {
            'filename': MODEL_FILES['model_v1'],  
            'description': 'Model V1 - EfficientNet-B3 (Balanced)',
            'size_mb': 89
        },
        'model_v2': {
            'filename': MODEL_FILES['model_v2'],  
            'description': 'Model V2 - MobileNetV3 (Lightweight)',
            'size_mb': 20
        },
        'model_v3': {
            'filename': MODEL_FILES['model_v3'],
            'description': 'Model V3 - ResNet50 (High accuracy)',
            'size_mb': 98
        }
    }
    
    def __init__(self, models_dir=None):
        """
        Initialize model manager
        
        Args:
            models_dir: Local directory to store models (default: backend/models)
        """
        if models_dir is None:
            # Use Config.MODEL_DIR if available, otherwise calculate it
            try:
                from core.config import Config
                self.models_dir = Config.MODEL_DIR
            except ImportError:
                # Fallback: go up two levels from services/ to backend/, then to models/
                self.models_dir = Path(__file__).parent.parent / 'models'
        else:
            self.models_dir = Path(models_dir)
            
        self.models_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📁 Models directory: {self.models_dir}")
    
    def get_available_models(self):
        """
        Get list of all available models
        
        Returns:
            Dictionary of available models with their info
        """
        return self.AVAILABLE_MODELS.copy()
    
    def download_model(self, model_key_or_filename):
        """
        Download a specific model from Hugging Face
        
        Args:
            model_key_or_filename: Model key (e.g., 'efficientnet-b3') or filename (e.g., 'efficientnet-b3_model.pth')
        
        Returns:
            Path to downloaded file
        """
        # Determine filename
        if model_key_or_filename in self.AVAILABLE_MODELS:
            filename = self.AVAILABLE_MODELS[model_key_or_filename]['filename']
            model_info = self.AVAILABLE_MODELS[model_key_or_filename]
        else:
            # Assume it's a filename
            filename = model_key_or_filename
            model_info = None
        
        local_path = self.models_dir / filename
        
        # Already exists? Return it
        if local_path.exists():
            logger.info(f"✅ Using cached model: {filename}")
            return local_path
        
        # Download from Hugging Face
        if model_info:
            logger.info(f"⬇️  Downloading {model_info['description']} ({model_info['size_mb']}MB)...")
        else:
            logger.info(f"⬇️  Downloading {filename} from Hugging Face...")
        
        try:
            # Download file (directly to repo root, no "models/" prefix)
            downloaded_path = hf_hub_download(
                repo_id=self.HF_REPO_ID,
                filename=filename,  # ← Direct filename at repo root
                cache_dir=str(self.models_dir / '.cache'),
                local_dir=str(self.models_dir),
                local_dir_use_symlinks=False
            )
            
            logger.info(f"✅ Downloaded: {filename}")
            return Path(downloaded_path)
            
        except Exception as e:
            logger.error(f"❌ Download failed: {e}")
            raise RuntimeError(
                f"Failed to download {filename} from Hugging Face.\n"
                f"Repository: {self.HF_REPO_ID}\n"
                f"Error: {e}"
            )
    
    def download_all_models(self):
        """
        Download all available models
        
        Returns:
            List of downloaded model paths
        """
        logger.info("📥 Downloading all models...")
        downloaded = []
        
        for model_key, model_info in self.AVAILABLE_MODELS.items():
            try:
                path = self.download_model(model_key)
                downloaded.append(path)
                logger.info(f"✅ {model_key}: {model_info['description']}")
            except Exception as e:
                logger.error(f"❌ Failed to download {model_key}: {e}")
        
        logger.info(f"✅ Downloaded {len(downloaded)}/{len(self.AVAILABLE_MODELS)} models")
        return downloaded
    
    def load_normalization_stats(self):
        """
        Load normalization statistics JSON file
        
        Returns:
            Dictionary with normalization stats
        """
        stats_file = 'normalization_stats.json'
        local_path = self.models_dir / stats_file
        
        # Try local first
        if local_path.exists():
            logger.info(f"✅ Using local {stats_file}")
            with open(local_path, 'r') as f:
                return json.load(f)
        
        # Download from Hugging Face
        logger.info(f"⬇️  Downloading {stats_file}...")
        try:
            downloaded_path = hf_hub_download(
                repo_id=self.HF_REPO_ID,
                filename=stats_file,  # ← Direct filename at repo root
                cache_dir=str(self.models_dir / '.cache'),
                local_dir=str(self.models_dir),
                local_dir_use_symlinks=False
            )
            
            with open(downloaded_path, 'r') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"❌ Failed to load normalization stats: {e}")
            raise
    
    def check_model_exists(self, model_key_or_filename):
        """
        Check if model exists locally
        
        Args:
            model_key_or_filename: Model key or filename
        
        Returns:
            Boolean indicating if model exists locally
        """
        if model_key_or_filename in self.AVAILABLE_MODELS:
            filename = self.AVAILABLE_MODELS[model_key_or_filename]['filename']
        else:
            filename = model_key_or_filename
        
        return (self.models_dir / filename).exists()
    
    def get_model_status(self):
        """
        Get download status of all models
        
        Returns:
            Dictionary with model status
        """
        status = {}
        for model_key, model_info in self.AVAILABLE_MODELS.items():
            filename = model_info['filename']
            local_path = self.models_dir / filename
            
            status[model_key] = {
                'filename': filename,
                'description': model_info['description'],
                'size_mb': model_info['size_mb'],
                'downloaded': local_path.exists(),
                'path': str(local_path) if local_path.exists() else None
            }
        
        return status


# Global instance
hf_manager = HuggingFaceModelManager()
