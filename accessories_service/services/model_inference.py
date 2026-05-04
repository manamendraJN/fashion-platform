import torch
from models.model_loader import load_model, load_json

# Load your models at server start, once!
MODEL1_PATH = "accessory_classifier_resnet152_inference.pth"
MODEL2_PATH = "dress_attribute_extractor_inference.pth"
MODEL3_PATH = "fusion_transformer_inference.pth"
MODEL4_PATH = "dqn_recommender_inference.pth"

model1 = load_model(MODEL1_PATH)
model1_enc = load_json("accessory_label_encoders.json")
model2 = load_model(MODEL2_PATH)
model2_enc = load_json("dress_label_encoders.json")
model3 = load_model(MODEL3_PATH)
model3_schema = load_json("fusion_metadata_schema.json")
model4 = load_model(MODEL4_PATH)
# (You might add logic for getting wardrobe, etc.)

def predict_accessory(image_bytes):
    # TODO: Image preprocessing here (see model1 requirements)
    # image_tensor = preprocess_image(image_bytes)
    # result = model1(image_tensor)
    # decode using model1_enc
    # return as dict
    return {"TODO": "Accessory prediction output goes here."}

def predict_dress(image_bytes):
    # TODO: Image preprocessing here (see model2 requirements)
    # image_tensor = preprocess_image(image_bytes)
    # result = model2(image_tensor)
    # decode using model2_enc
    # return as dict
    return {"TODO": "Dress attribute prediction output goes here."}

def recommend_accessories(dress_attrs, user_metadata):
    # Fuse using model3 (attributes + metadata)
    # Recommend with model4 (DQN)
    # Return top 3
    return {"TODO": "Accessory recommendations go here."}