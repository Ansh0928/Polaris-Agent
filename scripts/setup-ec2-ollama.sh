#!/bin/bash
# Run this on a fresh g4dn.xlarge EC2 instance (Ubuntu 22.04 Deep Learning AMI)
# Installs Ollama, pulls qwen3:14b, configures systemd to auto-start

set -e

echo "=== Installing Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

echo "=== Starting Ollama service ==="
sudo systemctl enable ollama
sudo systemctl start ollama
sleep 5

echo "=== Pulling qwen3:14b (this takes 5-10 min) ==="
ollama pull qwen3:14b

echo "=== Configuring Ollama to listen on all interfaces ==="
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
sleep 3

echo "=== Verifying ==="
curl -s http://localhost:11434/api/tags | python3 -m json.tool

echo ""
echo "=== DONE ==="
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

echo "EC2 public IP: $PUBLIC_IP"
echo ""
echo "Set these on Vercel:"
echo "  LLM_BASE_URL=http://$PUBLIC_IP:11434/v1"
echo "  LLM_MODEL=qwen3:14b"
echo "  LLM_NO_FALLBACK=true"
echo ""
echo "EC2 Security Group: allow inbound TCP port 11434 from 0.0.0.0/0"
echo ""
echo "Stop instance when done: aws ec2 stop-instances --instance-ids <ID>"
