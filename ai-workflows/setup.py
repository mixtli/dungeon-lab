from setuptools import setup, find_packages

setup(
    name="dungeon-lab-ai-workflows",
    version="0.1.0",
    description="AI-powered map generation and feature detection workflows for Dungeon Lab",
    author="Dungeon Lab Team",
    author_email="admin@dungeonlab.com",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.9",
    install_requires=[
        "prefect>=2.14.0",
        "openai>=1.0.0",
        "python-dotenv>=1.0.0",
        "pydantic>=2.0.0",
        "opencv-python>=4.8.0",
        "numpy>=1.24.0",
        "pillow>=10.0.0",
        "requests>=2.0.0",
        "matplotlib>=3.0.0",
        "torch>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "dl-map-gen=src.flows.map_generation:generate_map_flow",
            "dl-feature-detect=src.flows.feature_detection:detect_features_flow",
            "dl-register-flows=src.flows.register:register_deployments",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
) 