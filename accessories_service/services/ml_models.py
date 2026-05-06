import io
import os
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from config import MODELS_DIR, device, DRESS_ENC

INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std =[0.229, 0.224, 0.225]),
])


def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return INFERENCE_TRANSFORM(img).unsqueeze(0).to(device)


class AccessoryClassifier(nn.Module):
    def __init__(self, num_categories=12, num_genders=3, num_colors=25,
                 num_seasons=4, num_usages=5):
        super().__init__()
        self.backbone = models.resnet152(weights=None)
        nf = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.shared_fc = nn.Sequential(
            nn.Linear(nf, 1024), nn.ReLU(inplace=True), nn.BatchNorm1d(1024), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU(inplace=True), nn.BatchNorm1d(512), nn.Dropout(0.2),
        )
        self.category_head = nn.Sequential(
            nn.Linear(512, 256), nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(256, num_categories)
        )
        self.gender_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_genders)
        )
        self.color_head = nn.Sequential(
            nn.Linear(512, 256), nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(256, num_colors)
        )
        self.season_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_seasons)
        )
        self.usage_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_usages)
        )

    def forward(self, x):
        features = self.backbone(x)
        shared   = self.shared_fc(features)
        return {
            "category": self.category_head(shared),
            "gender":   self.gender_head(shared),
            "color":    self.color_head(shared),
            "season":   self.season_head(shared),
            "usage":    self.usage_head(shared),
            "features": shared,
        }


class DressAttributeExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = models.resnet152(weights=None)
        nf = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.shared_fc = nn.Sequential(
            nn.Linear(nf, 1024), nn.ReLU(inplace=True), nn.BatchNorm1d(1024), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU(inplace=True), nn.BatchNorm1d(512), nn.Dropout(0.2),
        )
        self.heads = nn.ModuleDict()
        for attr, info in DRESS_ENC.items():
            n = info["num_classes"]
            if n >= 10:
                self.heads[attr] = nn.Sequential(
                    nn.Linear(512, 256), nn.ReLU(), nn.Dropout(0.2), nn.Linear(256, n)
                )
            else:
                self.heads[attr] = nn.Sequential(
                    nn.Linear(512, 128), nn.ReLU(), nn.Linear(128, n)
                )

    def forward(self, x):
        s = self.shared_fc(self.backbone(x))
        out = {k: h(s) for k, h in self.heads.items()}
        out["features"] = s
        return out


class MultimodalFusionMLP(nn.Module):
    def __init__(self, dress_feat_dim=79, metadata_dim=20):
        super().__init__()
        total = dress_feat_dim + metadata_dim
        self.network = nn.Sequential(
            nn.Linear(total, 512), nn.LeakyReLU(0.1), nn.Dropout(0.3),
            nn.Linear(512, 512),   nn.LeakyReLU(0.1), nn.Dropout(0.3),
            nn.Linear(512, 256),   nn.LeakyReLU(0.1), nn.Dropout(0.2),
            nn.Linear(256, 256),   nn.LeakyReLU(0.1),
        )
        self.compatibility_head = nn.Sequential(
            nn.Linear(256, 64), nn.LeakyReLU(0.1),
            nn.Linear(64, 1),   nn.Sigmoid(),
        )

    def forward(self, dress_feat, meta):
        x     = torch.cat([dress_feat, meta], dim=1)
        fused = self.network(x)
        score = self.compatibility_head(fused).squeeze(-1)
        return {"fused_vector": fused, "compatibility_score": score}


class DuelingDQN(nn.Module):
    def __init__(self, state_dim=404, query_dim=128, accessory_dim=49):
        super().__init__()
        self.state_encoder = nn.Sequential(
            nn.Linear(state_dim, 512), nn.ReLU(inplace=True), nn.LayerNorm(512), nn.Dropout(0.1),
            nn.Linear(512, 256),       nn.ReLU(inplace=True), nn.LayerNorm(256), nn.Dropout(0.1),
        )
        self.value_stream      = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, 1))
        self.advantage_stream  = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, query_dim))
        self.accessory_encoder = nn.Sequential(
            nn.Linear(accessory_dim, query_dim), nn.ReLU(), nn.LayerNorm(query_dim)
        )

    def forward(self, state, wardrobe):
        enc     = self.state_encoder(state)
        value   = self.value_stream(enc)
        query   = self.advantage_stream(enc)
        acc_enc = self.accessory_encoder(wardrobe)
        scores  = torch.matmul(query, acc_enc.T)
        return value + scores - scores.mean(dim=1, keepdim=True)


# Module-level globals — set by load_models() at startup
model1 = None
model2 = None
model3 = None
model4 = None
wardrobe_tensor   = None
wardrobe_metadata = None


def load_models():
    global model1, model2, model3, model4, wardrobe_tensor, wardrobe_metadata
    print("\n" + "=" * 60 + "\n🔄  Loading models...\n" + "=" * 60)

    try:
        path = os.path.join(MODELS_DIR, "accessory_classifier_resnet152_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        m = AccessoryClassifier(
            num_categories=ckpt.get("num_categories", 12),
            num_genders   =ckpt.get("num_genders",    3),
            num_colors    =ckpt.get("num_colors",     25),
            num_seasons   =ckpt.get("num_seasons",    4),
            num_usages    =ckpt.get("num_usages",     5),
        ).to(device)
        sd = ckpt.get("model_state_dict") or ckpt.get("state_dict") or ckpt
        m.load_state_dict(sd)
        m.eval()
        model1 = m
        print("✅ Model 1 (Accessory Classifier) loaded")
    except Exception as e:
        print(f"⚠️  Model 1: {e}")

    try:
        path = os.path.join(MODELS_DIR, "dress_attribute_extractor_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        m    = DressAttributeExtractor().to(device)
        sd   = ckpt.get("model_state_dict") or ckpt.get("state_dict") or ckpt
        m.load_state_dict(sd)
        m.eval()
        model2 = m
        print("✅ Model 2 (Dress Extractor) loaded")
    except Exception as e:
        print(f"⚠️  Model 2: {e}")

    try:
        path = os.path.join(MODELS_DIR, "fusion_transformer_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        m    = MultimodalFusionMLP(
            dress_feat_dim=ckpt.get("dress_feat_dim", 79),
            metadata_dim  =ckpt.get("metadata_dim",   20),
        ).to(device)
        m.load_state_dict(ckpt["model_state_dict"])
        m.eval()
        model3 = m
        print("✅ Model 3 (Fusion MLP) loaded")
    except Exception as e:
        print(f"⚠️  Model 3: {e}")

    try:
        path = os.path.join(MODELS_DIR, "dqn_recommender_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        sd   = ckpt["policy_state_dict"]
        sdim = sd["state_encoder.0.weight"].shape[1]
        adim = sd["accessory_encoder.0.weight"].shape[1]
        qdim = sd["accessory_encoder.0.weight"].shape[0]
        m    = DuelingDQN(state_dim=sdim, query_dim=qdim, accessory_dim=adim).to(device)
        m.load_state_dict(sd)
        m.eval()
        model4            = m
        wardrobe_tensor   = ckpt["wardrobe_tensor"].to(device)
        wardrobe_metadata = ckpt["wardrobe_metadata"]
        print(f"✅ Model 4 (DQN) loaded | wardrobe={len(wardrobe_metadata)} items | state_dim={sdim} | acc_dim={adim}")
    except Exception as e:
        print(f"⚠️  Model 4: {e}")

    print("=" * 60 + "\n")
