import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.models import MobileNet_V3_Small_Weights

class TripletEmbeddingNet(nn.Module):
    """
    Lightweight CNN for generating 128D embeddings.
    Backbone: MobileNetV3-Small (Edge friendly).
    """
    def __init__(self, embedding_dim=128):
        super().__init__()
        # Load pretrained backbone
        self.backbone = models.mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
        
        # Remove classifier, replace with projection head
        # MobileNetV3 classifier input is 576
        self.backbone.classifier = nn.Sequential(
            nn.Linear(576, 256),
            nn.ReLU(),
            nn.Linear(256, embedding_dim)
        )

    def forward(self, x):
        x = self.backbone(x)
        # L2 Normalize embeddings
        return torch.nn.functional.normalize(x, p=2, dim=1)

class ExpertLayer(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, output_dim)
        )
    
    def forward(self, x):
        return self.net(x)

class MoEBlock(nn.Module):
    """
    Simplified Mixture of Experts Block.
    """
    def __init__(self, input_dim, num_experts=4, k=2):
        super().__init__()
        self.num_experts = num_experts
        self.k = k # Top-k experts to activate
        self.experts = nn.ModuleList([
            ExpertLayer(input_dim, input_dim*4, input_dim) for _ in range(num_experts)
        ])
        self.gate = nn.Linear(input_dim, num_experts)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x):
        # x shape: [batch, seq_len, dim]
        # Simple token-level gating
        gate_logits = self.gate(x)
        weights = self.softmax(gate_logits)
        
        # Top-k selection
        top_k_weights, top_k_indices = torch.topk(weights, self.k, dim=-1)
        
        # Normalize weights
        top_k_weights = top_k_weights / top_k_weights.sum(dim=-1, keepdim=True)
        
        output = torch.zeros_like(x)
        
        # Inefficient implementation for clarity/prototype
        # (Production would use scatter/gather ops)
        for batch_idx in range(x.size(0)):
            for seq_idx in range(x.size(1)):
                for k_idx in range(self.k):
                    expert_idx = top_k_indices[batch_idx, seq_idx, k_idx]
                    weight = top_k_weights[batch_idx, seq_idx, k_idx]
                    
                    expert_out = self.experts[expert_idx](x[batch_idx, seq_idx].unsqueeze(0))
                    output[batch_idx, seq_idx] += weight * expert_out.squeeze(0)
                    
        return output

class MoEViT(nn.Module):
    """
    Vision Transformer with MoE blocks.
    Simplified: Uses a ResNet backbone to tokenize, then a small Transformer with MoE.
    """
    def __init__(self, num_classes=3, dim=256, depth=4, heads=4, num_experts=4):
        super().__init__()
        
        # Hybrid architecture: CNN Feature extractor -> Transformer
        resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        self.cnn_extractor = nn.Sequential(*list(resnet.children())[:-2]) # Output: [B, 512, 7, 7]
        
        self.proj = nn.Conv2d(512, dim, kernel_size=1)
        
        # Transformer Encoder with MoE
        encoder_layer = nn.TransformerEncoderLayer(d_model=dim, nhead=heads, dim_feedforward=dim*2, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=depth)
        
        # Replace MLP in middle layers with MoE (Conceptual/Prototype)
        # For simplicity in this demo, we add the MoE block *after* the transformer
        self.moe = MoEBlock(dim, num_experts=num_experts)
        
        self.cls_token = nn.Parameter(torch.randn(1, 1, dim))
        self.pos_embed = nn.Parameter(torch.randn(1, 50, dim)) # 7*7 + 1
        
        self.mlp_head = nn.Sequential(
            nn.LayerNorm(dim),
            nn.Linear(dim, num_classes)
        )

    def forward(self, x):
        # CNN Feature Map
        x = self.cnn_extractor(x) # [B, 512, 7, 7]
        x = self.proj(x) # [B, dim, 7, 7]
        
        # Flatten
        B, C, H, W = x.shape
        x = x.flatten(2).transpose(1, 2) # [B, 49, dim]
        
        # Add CLS token
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        
        # Positional Embedding
        x = x + self.pos_embed
        
        # Transformer
        x = self.transformer(x)
        
        # MoE Block (Applied to all tokens)
        x = self.moe(x)
        
        # Classification on CLS token
        cls_out = x[:, 0]
        return self.mlp_head(cls_out)
