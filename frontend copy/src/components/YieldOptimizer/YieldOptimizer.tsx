import React, { useState, useEffect } from 'react';
import {
  Brain, Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  Download, Printer, RefreshCw, Sun, Wind, Droplets, Thermometer,
  Layers, FlaskConical, Globe, Calendar, ShieldCheck, Info, ChevronDown,
  Volume2, VolumeX, Share2, Sliders, DollarSign, TrendingUp, Satellite,
  BarChart2, Award, Zap
} from 'lucide-react';

interface InputVsIdealItem {
  param: string;
  label: string;
  unit: string;
  input_value: number;
  ideal_min: number;
  ideal_max: number;
  ideal_display: string;
  status: 'optimal' | 'warning' | 'critical';
  deviation: string;
}

interface ModelBenchmarkItem {
  model_name: string;
  predicted_yield: number;
  unit: string;
  r2_score: number;
  rmse: number;
  confidence_interval: string;
  architecture: string;
}

interface FertilizerCostItem {
  item_name: string;
  dosage: string;
  unit_cost_inr: string;
  total_cost_inr: number;
}

interface EconomicAnalysis {
  crop_msp_per_quintal_inr: number;
  estimated_input_cost_inr: number;
  potential_yield_gain_tonnes: number;
  gross_revenue_gain_inr: number;
  net_profit_inr: number;
  roi_multiplier: number;
  fertilizers_breakdown: FertilizerCostItem[];
}

interface SatelliteVegetation {
  estimated_ndvi: number;
  vigor_status: string;
  vegetation_condition_index: number;
  sensor_platform: string;
  spectral_band_red: number;
  spectral_band_nir: number;
}

interface CropYieldOptimizationResponse {
  crop: string;
  soil_type: string;
  predicted_yield: number;
  predicted_yield_unit: string;
  total_estimated_yield: number;
  yield_classification: 'High Yield' | 'Medium Yield' | 'Low Yield';
  yield_classification_color: string;
  season_suitability: {
    is_suitable: boolean;
    current_season: string;
    crop_seasons: string[];
    display_text: string;
  };
  input_vs_ideal: InputVsIdealItem[];
  suggestions: string[];
  model_metadata: {
    algorithm: string;
    library: string;
    max_depth: number;
    feature_importance: Record<string, number>;
  };
  model_benchmarks: ModelBenchmarkItem[];
  economic_analysis: EconomicAnalysis;
  satellite_vegetation: SatelliteVegetation;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type Language = 'en' | 'hi' | 'te' | 'ml' | 'ta' | 'kn' | 'mr' | 'bn' | 'gu' | 'pa';

export interface LanguageOption {
  code: Language;
  label: string;
  native: string;
}

export const INDIAN_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    title: 'AI-Powered Crop Yield Prediction & Optimization System',
    subtitle: 'Plan Smart, Farm Smarter! Decision Tree & Ensemble ML with Agronomic Benchmarking',
    enterDetails: 'Enter Agricultural Parameters',
    predictBtn: 'PREDICT YIELD & OPTIMIZE',
    predicting: 'Running ML Ensembles & Agronomic Engine...',
    cropType: 'Crop Type',
    soilType: 'Soil Type',
    soilPh: 'Soil pH',
    temp: 'Temperature (°C)',
    humidity: 'Humidity (%)',
    windSpeed: 'Wind Speed (km/h)',
    nitrogen: 'Nitrogen (N)',
    phosphorus: 'Phosphorus (P)',
    potassium: 'Potassium (K)',
    soilQuality: 'Soil Quality (1 - 5)',
    area: 'Land Area (Acres)',
    liveWeatherBtn: 'Fetch Live Weather',
    loadPreset: 'Load Research Paper Preset',
    outputTitle: 'Crop Yield Analysis & Optimization',
    seasonSuitability: 'Season Suitability',
    tableCheck: 'CHECK',
    tableParam: 'INPUT VS IDEAL',
    tableInput: 'INPUT',
    tableIdeal: 'IDEAL',
    tableDeviation: 'DEVIATION',
    suggestionsTitle: 'Actionable Improvement Suggestions',
    downloadPdf: 'Download PDF / Print Report',
    modelBadge: 'Decision Tree & Ensemble ML',
    featureImportance: 'Feature Importance Breakdown',
    whatIfTitle: 'Interactive "What-If" Sensitivity Simulator (XAI)',
    whatIfSubtitle: 'Adjust parameters below in real-time to observe yield recovery & classification jumps',
    whatIfReset: 'Reset to Original Inputs',
    whatIfApply: 'Apply to Main Parameters',
    multiModelTitle: 'Algorithm Battleground (Multi-Model Benchmark)',
    multiModelSubtitle: 'Parallel evaluation across Decision Tree, Random Forest, XGBoost & Linear Regression',
    economicTitle: 'Economic ROI & Fertilizer Cost Analysis (₹ INR)',
    satelliteTitle: 'Satellite NDVI & Crop Canopy Vigor',
    whatsappShare: 'Share via WhatsApp',
    listenAdvice: 'Listen to Advisory',
    stopSpeaking: 'Stop Audio'
  },
  hi: {
    title: 'फसल उपज भविष्यवक्ता एवं अनुकूलन प्रणाली',
    subtitle: 'योजना बनाएं, समझदारी से खेती करें! निर्णय वृक्ष एवं मशीन लर्निंग विश्लेषण',
    enterDetails: 'कृषि विवरण दर्ज करें',
    predictBtn: 'उपज का अनुमान लगाएं और अनुकूलित करें',
    predicting: 'एआई मॉडल विश्लेषण कर रहा है...',
    cropType: 'फसल का प्रकार',
    soilType: 'मिट्टी का प्रकार',
    soilPh: 'मिट्टी का पीएच (pH)',
    temp: 'तापमान (°C)',
    humidity: 'आर्द्रता (%)',
    windSpeed: 'हवा की गति (km/h)',
    nitrogen: 'नाइट्रोजन (N)',
    phosphorus: 'फास्फोरस (P)',
    potassium: 'पोटेशियम (K)',
    soilQuality: 'मिट्टी की गुणवत्ता (1 - 5)',
    area: 'भूमि क्षेत्र (एकड़)',
    liveWeatherBtn: 'लाइव मौसम डेटा प्राप्त करें',
    loadPreset: 'शोध पत्र का नमूना लोड करें',
    outputTitle: 'फसल उपज विश्लेषण एवं परिणाम',
    seasonSuitability: 'मौसम उपयुक्तता',
    tableCheck: 'जांच',
    tableParam: 'पैरामीटर तुलना',
    tableInput: 'दर्ज मान',
    tableIdeal: 'आदर्श मान',
    tableDeviation: 'अंतर',
    suggestionsTitle: 'उत्पादकता सुधार सुझाव',
    downloadPdf: 'पीडीएफ डाउनलोड करें / प्रिंट करें',
    modelBadge: 'डिसीजन ट्री एवं एन्सेम्बल मॉडल',
    featureImportance: 'मॉडल विशेषताओं का प्रभाव',
    whatIfTitle: 'इंटरैक्टिव "अगर-मगर" संवेदनशीलता सिम्युलेटर (XAI)',
    whatIfSubtitle: 'पैरामीटर बदलें और तुरंत उपज व श्रेणी में सुधार देखें',
    whatIfReset: 'मूल मान पर रीसेट करें',
    whatIfApply: 'मुख्य फॉर्म में लागू करें',
    multiModelTitle: 'एल्गोरिदम तुलना (मल्टी-मॉडल बेंचमार्क)',
    multiModelSubtitle: 'डिसीजन ट्री, रैंडम फॉरेस्ट और एक्सजीबूस्ट का तुलनात्मक विश्लेषण',
    economicTitle: 'उर्वरक लागत एवं आर्थिक लाभ विश्लेषण (₹ INR)',
    satelliteTitle: 'उपग्रह एनडीवीआई एवं फसल चंदवा स्वास्थ्य',
    whatsappShare: 'व्हाट्सएप पर साझा करें',
    listenAdvice: 'सलाह सुनें',
    stopSpeaking: 'ऑडियो रोकें'
  },
  te: {
    title: 'AI ఆధారిత పంట దిగుబడి అంచనా & ఆప్టిమైజేషన్ సిస్టమ్',
    subtitle: 'తెలివిగా ప్రణాళిక వేయండి, మరింత తెలివిగా వ్యవసాయం చేయండి! డెసిషన్ ట్రీ విశ్లేషణ',
    enterDetails: 'వ్యవసాయ పారామితులను నమోదు చేయండి',
    predictBtn: 'దిగుబడిని అంచనా వేయండి & ఆప్టిమైజ్ చేయండి',
    predicting: 'AI మోడల్ విశ్లేషిస్తోంది...',
    cropType: 'పంట రకం',
    soilType: 'నేల రకం',
    soilPh: 'నేల pH (ఆమ్లతత్త్వం)',
    temp: 'ఉష్ణోగ్రత (°C)',
    humidity: 'తేమ శాతం (%)',
    windSpeed: 'గాలి వేగం (km/h)',
    nitrogen: 'నత్రజని (N)',
    phosphorus: 'భాస్వరం (P)',
    potassium: 'పొటాషియం (K)',
    soilQuality: 'నేల నాణ్యత (1 - 5)',
    area: 'భూమి వైశాల్యం (ఎకరాలు)',
    liveWeatherBtn: 'ప్రత్యక్ష వాతావరణాన్ని పొందండి',
    loadPreset: 'రీసెర్చ్ పేపర్ ప్రిసెట్ లోడ్ చేయండి',
    outputTitle: 'పంట దిగుబడి విశ్లేషణ & ఫలితాలు',
    seasonSuitability: 'సీజన్ అనుకూలత',
    tableCheck: 'తనిఖీ',
    tableParam: 'ఇన్‌పుట్ vs ఆదర్శ విలువ',
    tableInput: 'నమోదు చేసిన విలువ',
    tableIdeal: 'ఆదర్శ పరిధి',
    tableDeviation: 'తేడా',
    suggestionsTitle: 'దిగుబడి మెరుగుదల సూచనలు',
    downloadPdf: 'PDF డౌన్‌లోడ్ / ప్రింట్ చేయండి',
    modelBadge: 'డెసిషన్ ట్రీ రిగ్రెసర్ (మెషిన్ లెర్నింగ్)',
    featureImportance: 'పారామితుల ప్రభావం',
    whatIfTitle: 'ఇంటరాక్టివ్ "ఒకవేళ ఇలా ఉంటే" సిమ్యులేటర్ (XAI)',
    whatIfSubtitle: 'పారామితులను మార్చి రియల్-టైమ్‌లో దిగుబడి పెరుగుదలను చూడండి',
    whatIfReset: 'అసలు విలువలకు రీసెట్ చేయండి',
    whatIfApply: 'ఫారమ్‌కు వర్తింపజేయండి',
    multiModelTitle: 'మల్టీ-మోడల్ అల్గోరిథం పోలిక',
    multiModelSubtitle: 'డెసిషన్ ట్రీ, రాండమ్ ఫారెస్ట్, XGBoost మరియు లీనియర్ రిగ్రెషన్',
    economicTitle: 'ఎరువుల ఖర్చు & ఆర్థిక లాభ విశ్లేషణ (₹ INR)',
    satelliteTitle: 'శాటిలైట్ NDVI & పంట పచ్చదనం సూచిక',
    whatsappShare: 'వాట్సాప్‌లో పంపండి',
    listenAdvice: 'సూచనలు వినండి',
    stopSpeaking: 'ఆడియో ఆపండి'
  },
  ml: {
    title: 'AI അധിഷ്ഠിത വിളവ് പ്രവചനവും ഒപ്റ്റിമൈസേഷൻ സിസ്റ്റവും',
    subtitle: 'കൃത്യമായി ആസൂത്രണം ചെയ്യുക, കാര്യക്ഷമമായി കൃഷി ചെയ്യുക! ഡിസിഷൻ ട്രീ അപഗ്രഥനം',
    enterDetails: 'കാർഷിക വിവരങ്ങൾ രേഖപ്പെടുത്തുക',
    predictBtn: 'വിളവ് പ്രവചിക്കുക & മെച്ചപ്പെടുത്തുക',
    predicting: 'AI മോഡൽ വിശകലനം ചെയ്യുന്നു...',
    cropType: 'വിളയുടെ ഇനം',
    soilType: 'മണ്ണിന്റെ തരം',
    soilPh: 'മണ്ണിലെ pH',
    temp: 'താപനില (°C)',
    humidity: 'ആർദ്രത (%)',
    windSpeed: 'കാറ്റിന്റെ വേഗത (km/h)',
    nitrogen: 'നൈട്രജൻ (N)',
    phosphorus: 'ഫോസ്ഫറസ് (P)',
    potassium: 'പൊട്ടാസ്യം (K)',
    soilQuality: 'മണ്ണിന്റെ ഗുണനിലവാരം (1 - 5)',
    area: 'ഭൂവിസ്തൃതി (ഏക്കർ)',
    liveWeatherBtn: 'തത്സമയ കാലാവസ്ഥ ലഭ്യമാക്കുക',
    loadPreset: 'ഗവേഷണ മാതൃക ലോഡ് ചെയ്യുക',
    outputTitle: 'വിളവ് വിശകലനവും നിർദ്ദേശങ്ങളും',
    seasonSuitability: 'സീസൺ അനുയോജ്യത',
    tableCheck: 'പരിശോധന',
    tableParam: 'ഇൻപുട്ട് vs അനുയോജ്യമായ നില',
    tableInput: 'രേഖപ്പെടുത്തിയ നില',
    tableIdeal: 'അനുയോജ്യമായ പരിധി',
    tableDeviation: 'വ്യത്യാസം',
    suggestionsTitle: 'മെച്ചപ്പെടുത്തൽ നിർദ്ദേശങ്ങൾ',
    downloadPdf: 'PDF ഡൗൺലോഡ് / പ്രിന്റ് ചെയ്യുക',
    modelBadge: 'ഡിസിഷൻ ട്രീ റിഗ്രസ്സർ (മെഷീൻ ലേണിംഗ്)',
    featureImportance: 'ഘടകങ്ങളുടെ പ്രാധാന്യം',
    whatIfTitle: 'തത്സമയ "മാറ്റങ്ങൾ" സിമുലേറ്റർ (XAI)',
    whatIfSubtitle: 'പോഷകങ്ങളും പിഎച്ചും മാറ്റി വിളവിലെ വർദ്ധനവ് തത്സമയം കാണുക',
    whatIfReset: 'യഥാർത്ഥ അളവിലേക്ക് മാറ്റുക',
    whatIfApply: 'ഫോമിൽ പ്രയോഗിക്കുക',
    multiModelTitle: 'മെഷീൻ ലേണിംഗ് മോഡലുകളുടെ താരതമ്യം',
    multiModelSubtitle: 'ഡിസിഷൻ ട്രീ, റാൻഡം ഫോറസ്റ്റ്, XGBoost എന്നിവയുടെ വിശകലനം',
    economicTitle: 'വളച്ചിലവും സാമ്പത്തിക ലാഭ വിശകലനവും (₹ INR)',
    satelliteTitle: 'ഉപഗ്രഹ എൻഡിവിഐ & വിള ആരോഗ്യ നില',
    whatsappShare: 'വാട്സാപ്പിൽ പങ്കിടുക',
    listenAdvice: 'നിർദ്ദേശങ്ങൾ കേൾക്കുക',
    stopSpeaking: 'ഓഡിയോ നിർത്തുക'
  },
  ta: {
    title: 'செயற்கை நுண்ணறிவு பயிர் விளைச்சல் முன்கணிப்பு அமைப்பு',
    subtitle: 'திட்டமிட்டு சாகுபடி செய்வோம்! இயந்திரக் கற்றல் உகப்பாக்கம்',
    enterDetails: 'விவசாய அளவுருக்களை உள்ளிடவும்',
    predictBtn: 'விளைச்சலைக் கணிக்கவும் & மேம்படுத்தவும்',
    predicting: 'பகுப்பாய்வு செய்கிறது...',
    cropType: 'பயிர் வகை',
    soilType: 'மண் வகை',
    soilPh: 'மண் அமிலத்தன்மை (pH)',
    temp: 'வெப்பநிலை (°C)',
    humidity: 'காற்றின் ஈரப்பதம் (%)',
    windSpeed: 'காற்றின் வேகம் (km/h)',
    nitrogen: 'நைட்ரஜன் (N)',
    phosphorus: 'பாஸ்பரஸ் (P)',
    potassium: 'பொட்டாசியம் (K)',
    soilQuality: 'மண் தரம் (1 - 5)',
    area: 'நிலப் பரப்பு (ஏக்கர்)',
    liveWeatherBtn: 'நேரலை வானிலை பெறுக',
    loadPreset: 'மாதிரித் தரவை ஏற்றுக',
    outputTitle: 'விளைச்சல் முன்கணிப்பு & பரிந்துரைகள்',
    seasonSuitability: 'பருவப் பொருத்தம்',
    tableCheck: 'சரிபார்ப்பு',
    tableParam: 'அளவுரு vs உகந்த அளவு',
    tableInput: 'உள்ளீடு',
    tableIdeal: 'உகந்தது',
    tableDeviation: 'வேறுபாடு',
    suggestionsTitle: 'மேம்படுத்தல் பரிந்துரைகள்',
    downloadPdf: 'PDF பதிவிறக்கம் / அச்சிடுக',
    modelBadge: 'தீர்வு மரம் வழிமுறை (Decision Tree)',
    featureImportance: 'காரணிகளின் முக்கியத்துவம்',
    whatIfTitle: 'ஊடாடும் "ஒருவேளை மாறினால்" சிமுலேட்டர் (XAI)',
    whatIfSubtitle: 'அளவுருக்களை மாற்றி உடனுக்குடன் விளைச்சல் அதிகரிப்பைப் பாருங்கள்',
    whatIfReset: 'ஆரம்ப நிலைக்கு மாற்றுக',
    whatIfApply: 'படிவத்தில் இணைக்குக',
    multiModelTitle: 'பல்வேறு அல்காரிதம்களின் ஒப்பீடு',
    multiModelSubtitle: 'Decision Tree, Random Forest, XGBoost மற்றும் Linear Regression',
    economicTitle: 'உரச் செலவு மற்றும் நிகர லாபப் பகுப்பாய்வு (₹ INR)',
    satelliteTitle: 'செயற்கைக்கோள் NDVI & பயிர் பசுமை குறியீடு',
    whatsappShare: 'வாட்ஸ்அப்பில் பகிரவும்',
    listenAdvice: 'பரிந்துரைகளைக் கேட்கவும்',
    stopSpeaking: 'ஆடியோவை நிறுத்து'
  },
  kn: {
    title: 'AI ಆಧಾರಿತ ಬೆಳೆ ಇಳುವರಿ ಮುನ್ಸೂಚನೆ & ಆಪ್ಟಿಮೈಸೇಶನ್ ವ್ಯವಸ್ಥೆ',
    subtitle: 'ಸ್ಮಾರ್ಟ್ ಆಗಿ ಯೋಜನೆ ರೂಪಿಸಿ, ಬುದ್ಧಿವಂತಿಕೆಯಿಂದ ಕೃಷಿ ಮಾಡಿ! ಡಿಸಿಷನ್ ಟ್ರೀ ವಿಶ್ಲೇಷಣೆ',
    enterDetails: 'ಕೃಷಿ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ',
    predictBtn: 'ಇಳುವರಿ ಊಹಿಸಿ & ಉತ್ತಮಗೊಳಿಸಿ',
    predicting: 'AI ಮಾದರಿಯು ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...',
    cropType: 'ಬೆಳೆಯ ಪ್ರಕಾರ',
    soilType: 'ಮಣ್ಣಿನ ಪ್ರಕಾರ',
    soilPh: 'ಮಣ್ಣಿನ pH',
    temp: 'ತಾಪಮಾನ (°C)',
    humidity: 'ಆರ್ದ್ರತೆ (%)',
    windSpeed: 'ಗಾಳಿಯ ವೇಗ (km/h)',
    nitrogen: 'ಸಾರಜನಕ (N)',
    phosphorus: 'ರಂಜಕ (P)',
    potassium: 'ಪೊಟ್ಯಾಶ್ (K)',
    soilQuality: 'ಮಣ್ಣಿನ ಗುಣಮಟ್ಟ (1 - 5)',
    area: 'ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)',
    liveWeatherBtn: 'ಲೈವ್ ಹವಾಮಾನ ಪಡೆಯಿರಿ',
    loadPreset: 'ಮಾದರಿ ಡೇಟಾ ಲೋಡ್ ಮಾಡಿ',
    outputTitle: 'ಬೆಳೆ ಇಳುವರಿ ವಿಶ್ಲೇಷಣೆ & ಫಲಿತಾಂಶಗಳು',
    seasonSuitability: 'ಋತುವಿನ ಸೂಕ್ತತೆ',
    tableCheck: 'ಪರಿಶೀಲನೆ',
    tableParam: 'ನಮೂದು vs ಆದರ್ಶ ಮಟ್ಟ',
    tableInput: 'ನಮೂದಿಸಿದ ಮೌಲ್ಯ',
    tableIdeal: 'ಆದರ್ಶ ಶ್ರೇಣಿ',
    tableDeviation: 'ವ್ಯತ್ಯಾಸ',
    suggestionsTitle: 'ಉತ್ಪಾದಕತೆ ಸುಧಾರಣಾ ಸಲಹೆಗಳು',
    downloadPdf: 'PDF ಡೌನ್‌ಲೋಡ್ / ಮುದ್ರಿಸಿ',
    modelBadge: 'ಡಿಸಿಷನ್ ಟ್ರೀ ರಿಗ್ರೆಸರ್ (ಮೆಷಿನ್ ಲರ್ನಿಂಗ್)',
    featureImportance: 'ಅಂಶಗಳ ಪ್ರಾಮುಖ್ಯತೆ',
    whatIfTitle: 'ಇಂಟರಾಕ್ಟಿವ್ "ಏನಾಗಬಹುದು" ಸಿಮ್ಯುಲೇಟರ್ (XAI)',
    whatIfSubtitle: 'ಪೋಷಕಾಂಶಗಳನ್ನು ಬದಲಾಯಿಸಿ ನೈಜ ಸಮಯದಲ್ಲಿ ಇಳುವರಿ ಬದಲಾವಣೆ ನೋಡಿ',
    whatIfReset: 'ಮೂಲ ಮೌಲ್ಯಗಳಿಗೆ ಮರುಹೊಂದಿಸಿ',
    whatIfApply: 'ಮುಖ್ಯ ಫಾರ್ಮ್‌ಗೆ ಅನ್ವಯಿಸಿ',
    multiModelTitle: 'ಮಾದರಿಗಳ ತುಲನಾತ್ಮಕ ಅಧ್ಯಯನ',
    multiModelSubtitle: 'Decision Tree, Random Forest & XGBoost',
    economicTitle: 'ಗೊಬ್ಬರದ ವೆಚ್ಚ & ಆರ್ಥಿಕ ಲಾಭ ವಿಶ್ಲೇಷಣೆ (₹ INR)',
    satelliteTitle: 'ಉಪಗ್ರಹ NDVI & ಬೆಳೆ ಹಸಿರುತನ',
    whatsappShare: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ',
    listenAdvice: 'ಸಲಹೆಗಳನ್ನು ಆಲಿಸಿ',
    stopSpeaking: 'ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ'
  },
  mr: {
    title: 'एआय आधारित पीक उत्पादन अंदाज आणि ऑप्टिमायझेशन प्रणाली',
    subtitle: 'स्मार्ट नियोजन करा, हुशारीने शेती करा! डिसिजन ट्री आधारित विश्लेषण',
    enterDetails: 'कृषी तपशील प्रविष्ट करा',
    predictBtn: 'उत्पादनाचा अंदाज घ्या आणि सुधारा',
    predicting: 'एआय मॉडेल विश्लेषण करत आहे...',
    cropType: 'पिकाचा प्रकार',
    soilType: 'मातीचा प्रकार',
    soilPh: 'मातीचा सामू (pH)',
    temp: 'तापमान (°C)',
    humidity: 'आर्द्रता (%)',
    windSpeed: 'वाऱ्याचा वेग (km/h)',
    nitrogen: 'नायट्रोजन (N)',
    phosphorus: 'फॉस्फरस (P)',
    potassium: 'पोटॅशियम (K)',
    soilQuality: 'मातीची गुणवत्ता (1 - 5)',
    area: 'जमीन क्षेत्र (एकर)',
    liveWeatherBtn: 'थेट हवामान माहिती मिळवा',
    loadPreset: 'संशोधन नमुना लोड करा',
    outputTitle: 'पीक उत्पादन विश्लेषण व शिफारसी',
    seasonSuitability: 'हंगाम अनुकूलता',
    tableCheck: 'तपासणी',
    tableParam: 'घटक तुलना',
    tableInput: 'प्रविष्ट मूल्य',
    tableIdeal: 'आदर्श मूल्य',
    tableDeviation: 'तफावत',
    suggestionsTitle: 'उत्पादन सुधारणा सल्ला',
    downloadPdf: 'पीडीएफ डाउनलोड करा / प्रिंट करा',
    modelBadge: 'डिसिजन ट्री रिग्रेसर (मशीन लर्निंग)',
    featureImportance: 'घटकांचे महत्त्व',
    whatIfTitle: 'इंटरॅक्टिव्ह "जर-तर" सिम्युलेटर (XAI)',
    whatIfSubtitle: 'घटक बदलून उत्पादनातील वाढ थेट पहा',
    whatIfReset: 'मूळ मूल्यांवर रीसेट करा',
    whatIfApply: 'फॉर्ममध्ये लागू करा',
    multiModelTitle: 'अल्गोरिदम तुलना (मल्टी-मॉडेल)',
    multiModelSubtitle: 'डिसिजन ट्री, रँडम फॉरेस्ट आणि एक्सजीबूस्ट',
    economicTitle: 'खत खर्च व आर्थिक नफा विश्लेषण (₹ INR)',
    satelliteTitle: 'उपग्रह NDVI व पीक आरोग्य',
    whatsappShare: 'व्हॉट्सॲपवर शेअर करा',
    listenAdvice: 'सल्ला ऐका',
    stopSpeaking: 'ऑडिओ थांबवा'
  },
  bn: {
    title: 'এআই ভিত্তিক ফসলের ফলন পূর্বাভাস ও অপ্টিমাইজেশন সিস্টেম',
    subtitle: 'পরিকল্পনা করুন দক্ষতার সাথে, চাষ করুন বুদ্ধিমত্তার সাথে! ডিসিশন ট্রি অ্যানালিসিস',
    enterDetails: 'কৃষি বিবরণ লিখুন',
    predictBtn: 'ফলন পূর্বাভাস দিন ও উন্নত করুন',
    predicting: 'এআই মডেল বিশ্লেষণ করছে...',
    cropType: 'ফসলের ধরন',
    soilType: 'মাটির ধরন',
    soilPh: 'মাটির পিএইচ (pH)',
    temp: 'তাপমাত্রা (°C)',
    humidity: 'আর্দ্রতা (%)',
    windSpeed: 'বাতাসের গতি (km/h)',
    nitrogen: 'নাইট্রোজেন (N)',
    phosphorus: 'ফসফরাস (P)',
    potassium: 'পটাশিয়াম (K)',
    soilQuality: 'মাটির মান (1 - 5)',
    area: 'জমির পরিমাণ (একর)',
    liveWeatherBtn: 'লাইভ আবহাওয়া দেখুন',
    loadPreset: 'গবেষণা নমুনা লোড করুন',
    outputTitle: 'ফসলের ফলন বিশ্লেষণ ও পরামর্শ',
    seasonSuitability: 'মৌসুম উপযোগিতা',
    tableCheck: 'যাচাই',
    tableParam: 'ইনপুট বনাম আদর্শ মান',
    tableInput: 'প্রদত্ত মান',
    tableIdeal: 'আদর্শ মান',
    tableDeviation: 'পার্থক্য',
    suggestionsTitle: 'উন্নতি সাধনের পরামর্শ',
    downloadPdf: 'পিডিএফ ডাউনলোড / প্রিন্ট করুন',
    modelBadge: 'ডিসিশন ট্রি রিগ্রেসর (মেশিন লার্নিং)',
    featureImportance: 'বৈশিষ্ট্যের গুরুত্ব',
    whatIfTitle: 'ইন্টারেক্টিভ "যদি এমন হয়" সিমুলেটর (XAI)',
    whatIfSubtitle: 'পরামিতি পরিবর্তন করে তাত্ক্ষণিক ফলন বৃদ্ধি দেখুন',
    whatIfReset: 'আসল মানে রিসেট করুন',
    whatIfApply: 'মূল ফর্মে প্রয়োগ করুন',
    multiModelTitle: 'অ্যালগরিদম তুলনা (মাল্টি-মডেল)',
    multiModelSubtitle: 'Decision Tree, Random Forest & XGBoost',
    economicTitle: 'সার খরচ ও অর্থনৈতিক মুনাফা বিশ্লেষণ (₹ INR)',
    satelliteTitle: 'স্যাটেলাইট এনডিভিআই ও ফসলের স্বাস্থ্য',
    whatsappShare: 'হোয়াটসঅ্যাপে শেয়ার করুন',
    listenAdvice: 'পরামর্শ শুনুন',
    stopSpeaking: 'অডিও থামান'
  },
  gu: {
    title: 'AI આધારિત પાક ઉત્પાદન આગાહી અને ઑપ્ટિમાઇઝેશન સિસ્ટમ',
    subtitle: 'સ્માર્ટ આયોજન કરો, બુદ્ધિપૂર્વક ખેતી કરો! ડિસિઝન ટ્રી વિશ્લેષણ',
    enterDetails: 'કૃષિ પરિમાણો દાખલ કરો',
    predictBtn: 'ઉત્પાદનની આગાહી કરો અને સુધારો',
    predicting: 'AI મોડેલ વિશ્લેષણ કરી રહ્યું છે...',
    cropType: 'પાકનો પ્રકાર',
    soilType: 'જમીનનો પ્રકાર',
    soilPh: 'જમીનનું pH',
    temp: 'તાપમાન (°C)',
    humidity: 'ભેજનું પ્રમાણ (%)',
    windSpeed: 'પવનની ગતિ (km/h)',
    nitrogen: 'નાઇટ્રોજન (N)',
    phosphorus: 'ફોસ્ફરસ (P)',
    potassium: 'પોટાશ (K)',
    soilQuality: 'જમીનની ગુણવત્તા (1 - 5)',
    area: 'જમીન વિસ્તાર (એકર)',
    liveWeatherBtn: 'લાઈવ હવામાન મેળવો',
    loadPreset: 'સંશોધન નમૂનો લોડ કરો',
    outputTitle: 'પાક ઉત્પાદન વિશ્લેષણ અને પરિણામો',
    seasonSuitability: 'ઋતુ અનુકૂળતા',
    tableCheck: 'ચકાસણી',
    tableParam: 'દાખલ કરેલ vs આદર્શ મૂલ્ય',
    tableInput: 'દાખલ મૂલ્ય',
    tableIdeal: 'આદર્શ મૂલ્ય',
    tableDeviation: 'તફાવત',
    suggestionsTitle: 'ઉત્પાદન સુધારણા સૂચનો',
    downloadPdf: 'PDF ડાઉનલોડ / પ્રિન્ટ કરો',
    modelBadge: 'ડિસિઝન ટ્રી રિગ્રેસર (મશીન લર્નિંગ)',
    featureImportance: 'પરિબળોનું મહત્વ',
    whatIfTitle: 'ઇન્ટરેક્ટિવ "જો-તો" સિમ્યુલેટર (XAI)',
    whatIfSubtitle: 'પરિમાણો બદલીને વાસ્તવિક સમયમાં ઉત્પાદન વધારો જુઓ',
    whatIfReset: 'મૂળ મૂલ્યો પર રીસેટ કરો',
    whatIfApply: 'ફોર્મમાં લાગુ કરો',
    multiModelTitle: 'મોડેલ્સની તુલનાત્મક સમીક્ષા',
    multiModelSubtitle: 'Decision Tree, Random Forest & XGBoost',
    economicTitle: 'ખાતર ખર્ચ અને આર્થિક નફો વિશ્લેષણ (₹ INR)',
    satelliteTitle: 'સેટેલાઇટ NDVI અને પાક હરિયાળી',
    whatsappShare: 'વોટ્સએપ પર શેર કરો',
    listenAdvice: 'સલાહ સાંભળો',
    stopSpeaking: 'ઑડિયો રોકો'
  },
  pa: {
    title: 'AI ਅਧਾਰਤ ਫਸਲ ਝਾੜ ਭਵਿੱਖਬਾਣੀ ਅਤੇ ਅਨੁਕੂਲਤਾ ਪ੍ਰਣਾਲੀ',
    subtitle: 'ਸਮਾਰਟ ਯੋਜਨਾ ਬਣਾਓ, ਸਮਝਦਾਰੀ ਨਾਲ ਖੇਤੀ ਕਰੋ! ਡਿਸੀਜ਼ਨ ਟ੍ਰੀ ਵਿਸ਼ਲੇਸ਼ਣ',
    enterDetails: 'ਖੇਤੀਬਾੜੀ ਵੇਰਵੇ ਦਰਜ ਕਰੋ',
    predictBtn: 'ਝਾੜ ਦਾ ਅੰਦਾਜ਼ਾ ਲਗਾਓ ਅਤੇ ਸੁਧਾਰੋ',
    predicting: 'AI ਮਾਡਲ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰ ਰਿਹਾ ਹੈ...',
    cropType: 'ਫਸਲ ਦੀ ਕਿਸਮ',
    soilType: 'ਮਿੱਟੀ ਦੀ ਕਿਸਮ',
    soilPh: 'ਮਿੱਟੀ ਦਾ pH',
    temp: 'ਤਾਪਮਾਨ (°C)',
    humidity: 'ਨਮੀ (%)',
    windSpeed: 'ਹਵਾ ਦੀ ਗਤੀ (km/h)',
    nitrogen: 'ਨਾਈਟ੍ਰੋਜਨ (N)',
    phosphorus: 'ਫਾਸਫੋਰਸ (P)',
    potassium: 'ਪੋਟਾਸ਼ੀਅਮ (K)',
    soilQuality: 'ਮਿੱਟੀ ਦੀ ਗੁਣਵੱਤਾ (1 - 5)',
    area: 'ਜ਼ਮੀਨ ਦਾ ਰਕਬਾ (ਏਕੜ)',
    liveWeatherBtn: 'ਲਾਈਵ ਮੌਸਮ ਜਾਣਕਾਰੀ ਪ੍ਰਾਪਤ ਕਰੋ',
    loadPreset: 'ਖੋਜ ਨਮੂਨਾ ਲੋਡ ਕਰੋ',
    outputTitle: 'ਫਸਲ ਝਾੜ ਵਿਸ਼ਲੇਸ਼ਣ ਅਤੇ ਸੁਝਾਅ',
    seasonSuitability: 'ਮੌਸਮੀ ਅਨੁਕੂਲਤਾ',
    tableCheck: 'ਜਾਂਚ',
    tableParam: 'ਦਰਜ ਮੁੱਲ ਬਨਾਮ ਆਦਰਸ਼ ਮੁੱਲ',
    tableInput: 'ਦਰਜ ਮੁੱਲ',
    tableIdeal: 'ਆਦਰਸ਼ ਮੁੱਲ',
    tableDeviation: 'ਅੰਤਰ',
    suggestionsTitle: 'ਉਤਪਾਦਕਤਾ ਸੁਧਾਰ ਸੁਝਾਅ',
    downloadPdf: 'ਪੀਡੀਐਫ ਡਾਊਨਲੋਡ / ਪ੍ਰਿੰਟ ਕਰੋ',
    modelBadge: 'ਡਿਸੀਜ਼ਨ ਟ੍ਰੀ ਰਿਗ੍ਰੈਸਰ (ਮਸ਼ੀਨ ਲਰਨਿੰਗ)',
    featureImportance: 'ਤੱਤਾਂ ਦੀ ਮਹੱਤਤਾ',
    whatIfTitle: 'ਇੰਟਰਐਕਟਿਵ "ਜੇਕਰ ਅਜਿਹਾ ਹੋਵੇ" ਸਿਮੂਲੇਟਰ (XAI)',
    whatIfSubtitle: 'ਪੈਰਾਮੀਟਰ ਬਦਲੋ ਅਤੇ ਰੀਅਲ-ਟਾਈਮ ਵਿੱਚ ਝਾੜ ਵਿੱਚ ਸੁਧਾਰ ਦੇਖੋ',
    whatIfReset: 'ਅਸਲ ਮੁੱਲ ਤੇ ਰੀਸੈਟ ਕਰੋ',
    whatIfApply: 'ਮੁੱਖ ਫਾਰਮ ਵਿੱਚ ਲਾਗੂ ਕਰੋ',
    multiModelTitle: 'ਮਾਡਲਾਂ ਦੀ ਤੁਲਨਾਤਮਕ ਸਮੀਖਿਆ',
    multiModelSubtitle: 'Decision Tree, Random Forest & XGBoost',
    economicTitle: 'ਖਾਦ ਖਰਚਾ ਅਤੇ ਆਰਥਿਕ ਮੁਨਾਫਾ ਵਿਸ਼ਲੇਸ਼ਣ (₹ INR)',
    satelliteTitle: 'ਸੈਟੇਲਾਈਟ NDVI ਅਤੇ ਫਸਲ ਦੀ ਸਿਹਤ',
    whatsappShare: 'ਵਟਸਐਪ ਤੇ ਸਾਂਝਾ ਕਰੋ',
    listenAdvice: 'ਸਲਾਹ ਸੁਣੋ',
    stopSpeaking: 'ਆਡੀਓ ਰੋਕੋ'
  }
};

const CROP_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'Sunflower': { hi: 'सूरजमुखी', te: 'పొద్దుతిరుగుడు', ml: 'സൂര്യകാന്തി', ta: 'சூரியகாந்தி', kn: 'ಸೂರ್ಯಕಾಂತಿ', mr: 'सूर्यफूल', bn: 'সূর্যমুখী', gu: 'સૂર્યમુખી', pa: 'ਸੂਰਜਮੁਖੀ' },
  'Barley': { hi: 'जौ', te: 'బార్లీ', ml: 'ബാർലി', ta: 'பார்லி', kn: 'ಬಾರ್ಲಿ', mr: 'जव', bn: 'বার্লি', gu: 'જવ', pa: 'ਜੌਂ' },
  'Rice': { hi: 'धान / चावल', te: 'వరి / బియ్యం', ml: 'നെല്ല് / അരി', ta: 'நெல் / அரிசி', kn: 'ಭತ್ತ / ಅಕ್ಕಿ', mr: 'भात / तांदूळ', bn: 'ধান / চাল', gu: 'ડાંગર / ચોખા', pa: 'ਝੋਨਾ / ਚਾਵਲ' },
  'Wheat': { hi: 'गेहूं', te: 'గోధుమలు', ml: 'ഗോതമ്പ്', ta: 'கோதுமை', kn: 'ಗೋಧಿ', mr: 'गहू', bn: 'গম', gu: 'ઘઉં', pa: 'ਕਣਕ' },
  'Maize (Corn)': { hi: 'मक्का', te: 'మొక్కజొన్న', ml: 'ചോളം', ta: 'மக்காச்சோளம்', kn: 'ಮೆಕ್ಕೆಜೋಳ', mr: 'मका', bn: 'ভুট্টা', gu: 'મકાઈ', pa: 'ਮੱਕੀ' },
  'Cotton': { hi: 'कपास', te: 'పత్తి', ml: 'പരുത്തി', ta: 'பருத்தி', kn: 'ಹತ್ತಿ', mr: 'कापूस', bn: 'তুলা', gu: 'કપાસ', pa: 'ਕਪਾਹ' },
  'Tomato': { hi: 'टमाटर', te: 'టమోటా', ml: 'തക്കാളി', ta: 'தக்காளி', kn: 'ಟೊಮೆಟೊ', mr: 'टोमॅटो', bn: 'টমেটো', gu: 'ટામેટા', pa: 'ਟਮਾਟਰ' },
  'Potato': { hi: 'आलू', te: 'బంగాళాదుంప', ml: 'உരുളക്കിഴങ്ങ്', ta: 'உருளைக்கிழங்கு', kn: 'ಆಲೂಗಡ್ಡೆ', mr: 'बटाटा', bn: 'আলু', gu: 'બટાકા', pa: 'ਆਲੂ' },
  'Sugarcane': { hi: 'गन्ना', te: 'చెరకు', ml: 'കരിമ്പ്', ta: 'கரும்பு', kn: 'ಕಬ್ಬು', mr: 'ऊस', bn: 'আখ', gu: 'શેરડી', pa: 'ਗੰਨਾ' },
  'Chickpea': { hi: 'चना', te: 'శనగలు', ml: 'കടല', ta: 'கொண்டைக்கடலை', kn: 'ಕಡಲೆ', mr: 'हरभरा', bn: 'ছোলা', gu: 'ચણા', pa: 'ਛੋਲੇ' },
  'Groundnut': { hi: 'मूंगफली', te: 'వేరుశెనగ', ml: 'നിലക്കടല', ta: 'நிலக்கடலை', kn: 'ಕಡಲೆಕಾಯಿ', mr: 'भुईमूग', bn: 'চীনাবাদাম', gu: 'મગફળી', pa: 'ਮੂੰਗਫਲੀ' },
};

const SOIL_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'Loamy': { hi: 'दोमट मिट्टी', te: 'ఒండ్రు నేల (లోమి)', ml: 'എക്കൽ മണ്ണ്', ta: 'வண்டல் மண்', kn: 'ಗೋಡು ಮಣ್ಣು', mr: 'गाळाची माती', bn: 'দোআঁশ মাটি', gu: 'ગોરાડુ જમીન', pa: 'ਦੋਮਟ ਮਿੱਟੀ' },
  'Clay': { hi: 'चिकनी मिट्टी', te: 'జిగట నేల (క్లే)', ml: 'കളിമണ്ണ്', ta: 'களிமண்', kn: 'ಜೇಡಿ ಮಣ್ಣು', mr: 'काळी चिकनमाती', bn: 'এঁটেল মাটি', gu: 'કાળી ચીકણી જમીન', pa: 'ਚੀਕਣੀ ਮਿੱਟੀ' },
  'Sandy Loam': { hi: 'बलुई दोमट', te: 'ఇసుక ఒండ్రు నేల', ml: 'മണൽ കലർന്ന മണ്ണ്', ta: 'மணல் வண்டல் மண்', kn: 'ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು', mr: 'वालुकामय माती', bn: 'বেলে দোআঁশ', gu: 'રેતાળ ગોરાડુ', pa: 'ਰੇਤਲੀ ਦੋਮਟ' },
  'Black / Alluvial': { hi: 'काली / जलोढ़ मिट्टी', te: 'నల్ల రేగడి / ఒండ్రు నేల', ml: 'കറുത്ത / എക്കൽ മണ്ണ്', ta: 'கரிசல் / வண்டல் மண்', kn: 'ಕಪ್ಪು / ಮೆಕ್ಕಲು ಮಣ್ಣು', mr: 'काळी / गाळाची माती', bn: 'পলিমাটি / কালো মাটি', gu: 'કાળી રેગુર જમીન', pa: 'ਕਾਲੀ / ਜਲੋੜ ਮਿੱਟੀ' },
  'Peaty': { hi: 'पीट / दलदली मिट्टी', te: 'పీటీ నేల (పీట్)', ml: 'പീറ്റ് മണ്ണ്', ta: 'பீட் மண்', kn: 'ಪೀಟ್ ಮಣ್ಣು', mr: 'पीट माती', bn: 'পিট মাটি', gu: 'પીટ જમીન', pa: 'ਪੀਟ ਮਿੱਟੀ' },
  'Silt': { hi: 'सिल्ट / गाद', te: 'సిల్ట్ నేల', ml: 'സിൽറ്റ് മണ്ണ്', ta: 'வண்டல் சகதி', kn: 'ಹೂಳು ಮಣ್ಣು', mr: 'सिल्ट माती', bn: 'পলি মাটি', gu: 'કાંપવાળી જમીન', pa: 'ਸਿਲਟ ਮਿੱਟੀ' },
  'Chalky': { hi: 'चूनेदार मिट्टी', te: 'సున్నపు నేల', ml: 'ചോക്കി മണ്ണ്', ta: 'சுண்ணாம்பு மண்', kn: 'ಸುಣ್ಣದ ಮಣ್ಣು', mr: 'चुनखडी माती', bn: 'চুনযুক্ত মাটি', gu: 'ચૂનાવાળી જમીન', pa: 'ਚੂਨੇਦਾਰ ਮਿੱਟੀ' }
};

export default function YieldOptimizer() {
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  // Metadata
  const [cropsList, setCropsList] = useState<string[]>([
    'Sunflower', 'Barley', 'Rice', 'Wheat', 'Maize (Corn)', 'Cotton', 'Tomato', 'Potato', 'Sugarcane', 'Chickpea', 'Groundnut'
  ]);
  const [soilTypesList, setSoilTypesList] = useState<string[]>([
    'Loamy', 'Clay', 'Sandy Loam', 'Black / Alluvial', 'Peaty', 'Silt', 'Chalky'
  ]);
  const [presets, setPresets] = useState<any[]>([]);

  // Form State
  const [crop, setCrop] = useState('Sunflower');
  const [soilType, setSoilType] = useState('Peaty');
  const [soilPh, setSoilPh] = useState(4.0);
  const [temperature, setTemperature] = useState(45.0);
  const [humidity, setHumidity] = useState(86.0);
  const [windSpeed, setWindSpeed] = useState(6.0);
  const [nitrogen, setNitrogen] = useState(32.0);
  const [phosphorus, setPhosphorus] = useState(42.0);
  const [potassium, setPotassium] = useState(35.0);
  const [soilQuality, setSoilQuality] = useState(3.0);
  const [areaAcres, setAreaAcres] = useState(2.5);

  // Results State
  const [isLoading, setIsLoading] = useState(false);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [result, setResult] = useState<CropYieldOptimizationResponse | null>(null);

  // What-If Simulation State (Explainable AI)
  const [whatIfPh, setWhatIfPh] = useState(soilPh);
  const [whatIfN, setWhatIfN] = useState(nitrogen);
  const [whatIfTemp, setWhatIfTemp] = useState(temperature);
  const [whatIfQuality, setWhatIfQuality] = useState(soilQuality);

  // Speech Narration State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Active View Tab in Results
  const [resultTab, setResultTab] = useState<'overview' | 'whatif' | 'models' | 'economics' | 'satellite'>('overview');

  // Fetch crops metadata & presets on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ml/crops-meta`)
      .then(res => res.json())
      .then(data => {
        if (data.crops) setCropsList(data.crops);
        if (data.soil_types) setSoilTypesList(data.soil_types);
        if (data.presets) setPresets(data.presets);
      })
      .catch(err => console.error("Could not load crops meta", err));
  }, []);

  // Sync what-if state when main form changes
  useEffect(() => {
    setWhatIfPh(soilPh);
    setWhatIfN(nitrogen);
    setWhatIfTemp(temperature);
    setWhatIfQuality(soilQuality);
  }, [soilPh, nitrogen, temperature, soilQuality]);

  const handleApplyPreset = (presetData: any) => {
    if (!presetData) return;
    setCrop(presetData.crop);
    setSoilType(presetData.soil_type);
    setSoilPh(presetData.soil_ph);
    setTemperature(presetData.temperature);
    setHumidity(presetData.humidity);
    setWindSpeed(presetData.wind_speed);
    setNitrogen(presetData.nitrogen);
    setPhosphorus(presetData.phosphorus);
    setPotassium(presetData.potassium);
    setSoilQuality(presetData.soil_quality);
    if (presetData.area_acres) setAreaAcres(presetData.area_acres);
  };

  const handleFetchLiveWeather = async () => {
    setIsWeatherLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m`);
              const data = await res.json();
              if (data.current_weather) {
                setTemperature(Math.round(data.current_weather.temperature));
                setWindSpeed(Math.round(data.current_weather.windspeed));
                if (data.hourly && data.hourly.relativehumidity_2m) {
                  setHumidity(Math.round(data.hourly.relativehumidity_2m[0]));
                }
              }
            } catch {
              setTemperature(28);
              setHumidity(65);
              setWindSpeed(10);
            } finally {
              setIsWeatherLoading(false);
            }
          },
          () => {
            setTemperature(28);
            setHumidity(65);
            setWindSpeed(10);
            setIsWeatherLoading(false);
          },
          { timeout: 5000 }
        );
      } else {
        setTemperature(28);
        setHumidity(65);
        setWindSpeed(10);
        setIsWeatherLoading(false);
      }
    } catch {
      setIsWeatherLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        crop,
        soil_type: soilType,
        soil_ph: Number(soilPh),
        temperature: Number(temperature),
        humidity: Number(humidity),
        wind_speed: Number(windSpeed),
        nitrogen: Number(nitrogen),
        phosphorus: Number(phosphorus),
        potassium: Number(potassium),
        soil_quality: Number(soilQuality),
        area_acres: Number(areaAcres)
      };

      const res = await fetch(`${API_BASE}/api/ml/predict-yield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Prediction API failed");
      const data: CropYieldOptimizationResponse = await res.json();
      setResult(data);

      setTimeout(() => {
        document.getElementById('optimization-results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
      alert("Failed to compute yield prediction. Please verify the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    if (!result) return;
    const msg = `🌾 *Agri-Yield Pro Advisory Report*\n\n` +
      `🌱 *Crop:* ${result.crop} (${result.soil_type} Soil)\n` +
      `📊 *Predicted Yield:* ${result.predicted_yield} ${result.predicted_yield_unit} (${result.yield_classification})\n` +
      `🗓 *Season:* ${result.season_suitability.display_text}\n` +
      `💰 *Estimated Net Profit:* ₹${result.economic_analysis.net_profit_inr.toLocaleString('en-IN')} (ROI: ${result.economic_analysis.roi_multiplier}x)\n` +
      `🛰 *Satellite NDVI:* ${result.satellite_vegetation.estimated_ndvi} (${result.satellite_vegetation.vigor_status})\n\n` +
      `💡 *Top Recommendations:*\n` +
      result.suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n') +
      `\n\nGenerated with Agri-Yield Pro`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Speech Narration Handler (TTS)
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window) || !result) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const speechLangMap: Record<Language, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ml: 'ml-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      gu: 'gu-IN',
      pa: 'pa-IN'
    };

    const textToSpeak = `${t.outputTitle}. ${result.crop}. ${result.yield_classification}. ` +
      result.suggestions.slice(0, 4).join('. ');

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = speechLangMap[lang] || 'en-IN';
    utterance.rate = 0.92;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Live What-If Calculation
  const computeWhatIfYield = () => {
    if (!result) return 0;
    const base = result.predicted_yield;
    const phDelta = (whatIfPh - soilPh) * 0.22;
    const nDelta = ((whatIfN - nitrogen) / 100) * 0.40;
    const tempDelta = (temperature > 30 && whatIfTemp < temperature) ? (temperature - whatIfTemp) * 0.05 : 0;
    const qDelta = (whatIfQuality - soilQuality) * 0.18;
    const estimated = Math.max(0.2, base + phDelta + nDelta + tempDelta + qDelta);
    return Math.round(estimated * 100) / 100;
  };

  const whatIfSimYield = computeWhatIfYield();
  const whatIfDelta = result ? Math.round((whatIfSimYield - result.predicted_yield) * 100) / 100 : 0;
  const whatIfPct = result && result.predicted_yield > 0 ? Math.round((whatIfDelta / result.predicted_yield) * 100) : 0;

  const getWhatIfClassification = (y: number) => {
    if (!result) return 'Low Yield';
    if (y >= 1.8) return 'High Yield';
    if (y >= 1.2) return 'Medium Yield';
    return 'Low Yield';
  };

  const whatIfClass = getWhatIfClassification(whatIfSimYield);

  const applyWhatIfToMainForm = () => {
    setSoilPh(whatIfPh);
    setNitrogen(whatIfN);
    setTemperature(whatIfTemp);
    setSoilQuality(whatIfQuality);
    alert("What-If parameters applied! Click 'PREDICT YIELD' to update official models.");
  };

  const formatCropLabel = (c: string) => {
    const regional = CROP_TRANSLATIONS[c]?.[lang];
    if (regional && lang !== 'en') {
      return `${regional} (${c})`;
    }
    return c;
  };

  const formatSoilLabel = (st: string) => {
    const regional = SOIL_TRANSLATIONS[st]?.[lang];
    if (regional && lang !== 'en') {
      return `${regional} (${st})`;
    }
    return st;
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-6 font-sans">
      {/* ── Header with Multi-Language Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Brain size={22} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {t.title}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {t.modelBadge}
            </span>
          </div>
          <p className="text-xs md:text-sm text-neutral-400">
            {t.subtitle}
          </p>
        </div>

        {/* ── Major Indian Languages Selector ── */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Quick-tap popular languages */}
          <div className="hidden xl:flex items-center gap-1 bg-neutral-900/90 border border-white/10 rounded-xl p-1">
            {(['en', 'hi', 'te', 'ml', 'ta'] as Language[]).map(code => {
              const opt = INDIAN_LANGUAGES.find(l => l.code === code)!;
              const active = lang === code;
              return (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                    active ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.native}
                </button>
              );
            })}
          </div>

          {/* Full 10-Language Dropdown */}
          <div className="relative flex items-center bg-neutral-900/90 border border-white/10 rounded-xl px-3 py-1.5 hover:border-emerald-500/40 transition-colors shadow-lg">
            <Globe size={15} className="text-emerald-400 mr-2 shrink-0" />
            <select
              value={lang}
              onChange={e => setLang(e.target.value as Language)}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer pr-4 appearance-none"
            >
              {INDIAN_LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="bg-neutral-900 text-white py-1">
                  {l.native} — {l.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-neutral-400 pointer-events-none absolute right-2.5" />
          </div>
        </div>
      </div>

      {/* ── Preset & Quick Actions Bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 mr-1">
            <Sparkles size={14} className="text-emerald-400" />
            {t.loadPreset}:
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.data)}
              className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-emerald-500/20 text-neutral-200 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 transition-all"
            >
              {p.name.split(':')[0]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleFetchLiveWeather}
          disabled={isWeatherLoading}
          className="text-xs px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isWeatherLoading ? 'animate-spin' : ''} />
          {t.liveWeatherBtn}
        </button>
      </div>

      {/* ── Main Input Form (Matching Paper Figures 4 & 5) ── */}
      <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 rounded-2xl border border-white/10 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-6 border-b border-white/10 pb-4">
          <FlaskConical size={20} className="text-emerald-400" />
          <h2 className="text-base md:text-lg font-semibold text-white tracking-wide">
            {t.enterDetails}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Column 1 */}
          <div className="space-y-4">
            {/* Soil pH */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.soilPh}</span>
                <span className="text-neutral-500">Value: {soilPh}</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="10.0"
                value={soilPh}
                onChange={e => setSoilPh(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Humidity */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.humidity}</span>
                <span className="text-neutral-500">{humidity}%</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={humidity}
                onChange={e => setHumidity(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Nitrogen */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.nitrogen} (kg/ha)</span>
                <span className="text-neutral-500">{nitrogen} kg/ha</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="300"
                value={nitrogen}
                onChange={e => setNitrogen(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Soil Quality Rating */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.soilQuality}</span>
                <span className="text-emerald-400 font-semibold">{soilQuality} / 5</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={soilQuality}
                onChange={e => setSoilQuality(parseFloat(e.target.value) || 1)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Soil Type Dropdown with Regional Names */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t.soilType}
              </label>
              <div className="relative">
                <select
                  value={soilType}
                  onChange={e => setSoilType(e.target.value)}
                  className="w-full appearance-none bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors pr-10"
                >
                  {soilTypesList.map((st, i) => (
                    <option key={i} value={st} className="bg-neutral-900 text-white">
                      {formatSoilLabel(st)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            {/* Temperature */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.temp}</span>
                <span className="text-neutral-500">{temperature}°C</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="-10"
                max="60"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Wind Speed */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex justify-between">
                <span>{t.windSpeed}</span>
                <span className="text-neutral-500">{windSpeed} km/h</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={windSpeed}
                onChange={e => setWindSpeed(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>

            {/* Phosphorus & Potassium */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  {t.phosphorus}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={phosphorus}
                  onChange={e => setPhosphorus(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  {t.potassium}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={potassium}
                  onChange={e => setPotassium(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Crop Type Dropdown with Regional Names */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t.cropType}
              </label>
              <div className="relative">
                <select
                  value={crop}
                  onChange={e => setCrop(e.target.value)}
                  className="w-full appearance-none bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors pr-10"
                >
                  {cropsList.map((c, i) => (
                    <option key={i} value={c} className="bg-neutral-900 text-white">
                      {formatCropLabel(c)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Area in Acres */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t.area}
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="1000"
                value={areaAcres}
                onChange={e => setAreaAcres(parseFloat(e.target.value) || 1)}
                className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-5 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t.predicting}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {t.predictBtn}
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Results & Optimization Section ── */}
      {result && (
        <div id="optimization-results-section" className="space-y-6 animate-fade-in print:text-black">
          {/* Top Banner Card: Yield Prediction + Classification Badge */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-2xl relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,10,14,0.95))' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                    {formatCropLabel(result.crop)} • {formatSoilLabel(result.soil_type)}
                  </span>
                  
                  {/* Yield Classification Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-md ${
                    result.yield_classification === 'High Yield'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-900/20'
                      : result.yield_classification === 'Medium Yield'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-900/20'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-900/20'
                  }`}>
                    {result.yield_classification}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                    {result.predicted_yield}
                  </h3>
                  <span className="text-lg md:text-xl font-medium text-neutral-400">
                    {result.predicted_yield_unit}
                  </span>
                  <div className="h-6 w-[1px] bg-white/20 mx-2 hidden sm:block"></div>
                  <span className="text-sm md:text-base text-neutral-300 hidden sm:inline">
                    Est. Total: <span className="font-bold text-emerald-400">{result.total_estimated_yield} tonnes</span> ({areaAcres} acres)
                  </span>
                </div>

                {/* Season Suitability Indicator */}
                <div className="flex items-center gap-2 mt-4 text-xs md:text-sm">
                  {result.season_suitability.is_suitable ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 size={16} />
                      <span>{t.seasonSuitability}: <strong>{result.season_suitability.display_text}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <AlertTriangle size={16} />
                      <span>{t.seasonSuitability}: <strong>{result.season_suitability.display_text}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp + Audio TTS + Print PDF */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto print:hidden">
                {/* Audio Narration Button */}
                <button
                  onClick={handleToggleSpeak}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSpeaking
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10 hover:border-emerald-500/30'
                  }`}
                  title={isSpeaking ? t.stopSpeaking : t.listenAdvice}
                >
                  {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span>{isSpeaking ? t.stopSpeaking : t.listenAdvice}</span>
                </button>

                {/* WhatsApp Share Button */}
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Share summary on WhatsApp"
                >
                  <Share2 size={15} />
                  <span>{t.whatsappShare}</span>
                </button>

                {/* Print PDF Button */}
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 hover:border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Printer size={15} />
                  <span>{t.downloadPdf}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Sub-Navigation Tabs for Deep Analysis ── */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 print:hidden">
            <button
              onClick={() => setResultTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                resultTab === 'overview'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={14} />
              Input vs. Ideal Table
            </button>
            <button
              onClick={() => setResultTab('whatif')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                resultTab === 'whatif'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders size={14} />
              What-If Simulator (XAI)
            </button>
            <button
              onClick={() => setResultTab('models')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                resultTab === 'models'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 size={14} />
              Multi-Model Arena
            </button>
            <button
              onClick={() => setResultTab('economics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                resultTab === 'economics'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <DollarSign size={14} />
              Economic ROI & Fertilizer Cost
            </button>
            <button
              onClick={() => setResultTab('satellite')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                resultTab === 'satellite'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Satellite size={14} />
              Satellite NDVI Gauge
            </button>
          </div>

          {/* ── TAB 1: Input vs Ideal Table (Default) ── */}
          {resultTab === 'overview' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <h4 className="text-sm md:text-base font-semibold text-white tracking-wide flex items-center gap-2">
                    <Layers size={18} className="text-emerald-400" />
                    {t.tableParam}
                  </h4>
                  <span className="text-xs text-neutral-400">
                    Benchmark: Scientific Agronomy Standards
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/20 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3.5 px-6 w-20 text-center">{t.tableCheck}</th>
                        <th className="py-3.5 px-6">{t.tableParam}</th>
                        <th className="py-3.5 px-6">{t.tableInput}</th>
                        <th className="py-3.5 px-6">{t.tableIdeal}</th>
                        <th className="py-3.5 px-6">{t.tableDeviation}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-xs md:text-sm">
                      {result.input_vs_ideal.map((item, idx) => {
                        const isOptimal = item.status === 'optimal';
                        const isWarning = item.status === 'warning';
                        return (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-6 text-center">
                              {isOptimal ? (
                                <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                  <CheckCircle2 size={16} />
                                </span>
                              ) : isWarning ? (
                                <span className="inline-flex items-center justify-center p-1 rounded-full bg-amber-500/20 text-amber-400">
                                  <AlertTriangle size={16} />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center p-1 rounded-full bg-rose-500/20 text-rose-400">
                                  <XCircle size={16} />
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-6 font-sans font-medium text-white">{item.label}</td>
                            <td className="py-3 px-6 text-neutral-200">{item.input_value} {item.unit}</td>
                            <td className="py-3 px-6 text-neutral-400">{item.ideal_display}</td>
                            <td className="py-3 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                isOptimal
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : isWarning
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {item.deviation}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/10 shadow-xl">
                  <h4 className="text-sm md:text-base font-semibold text-white tracking-wide mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    {t.suggestionsTitle}
                  </h4>
                  <div className="space-y-3">
                    {result.suggestions.map((sug, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 transition-colors">
                        <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                          <ArrowRight size={13} />
                        </div>
                        <p className="text-xs md:text-sm text-neutral-200 leading-relaxed font-sans">{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl border border-white/10 shadow-xl">
                  <h4 className="text-sm md:text-base font-semibold text-white tracking-wide mb-3 flex items-center gap-2">
                    <Brain size={18} className="text-teal-400" />
                    {t.featureImportance}
                  </h4>
                  <p className="text-xs text-neutral-400 mb-4">Decision tree split weights across agronomic factors.</p>
                  <div className="space-y-2.5">
                    {Object.entries(result.model_metadata.feature_importance).slice(0, 6).map(([feat, pct], i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-300">{feat}</span>
                          <span className="text-emerald-400 font-mono font-medium">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${pct * 3}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Interactive "What-If" Sensitivity Simulator (XAI) ── */}
          {resultTab === 'whatif' && (
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-purple-500/30 shadow-2xl relative overflow-hidden bg-neutral-900/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sliders size={20} className="text-purple-400" />
                    <h3 className="text-base md:text-lg font-bold text-white tracking-wide">
                      {t.whatIfTitle}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {t.whatIfSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setWhatIfPh(soilPh);
                      setWhatIfN(nitrogen);
                      setWhatIfTemp(temperature);
                      setWhatIfQuality(soilQuality);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-all"
                  >
                    {t.whatIfReset}
                  </button>
                  <button
                    onClick={applyWhatIfToMainForm}
                    className="text-xs px-3.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all font-semibold flex items-center gap-1.5"
                  >
                    <Zap size={13} />
                    {t.whatIfApply}
                  </button>
                </div>
              </div>

              {/* What-If Live Results Badge */}
              <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/25 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Simulated Yield Output</span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl font-black text-white font-mono">{whatIfSimYield}</span>
                    <span className="text-sm text-neutral-400">{result.predicted_yield_unit}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                      whatIfClass === 'High Yield'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : whatIfClass === 'Medium Yield'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {whatIfClass}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-neutral-400">Projected Yield Recovery</div>
                  <div className={`text-xl font-bold font-mono ${whatIfDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {whatIfDelta >= 0 ? `+${whatIfDelta}` : whatIfDelta} t/ha ({whatIfDelta >= 0 ? `+${whatIfPct}` : whatIfPct}%)
                  </div>
                </div>
              </div>

              {/* Interactive Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Soil pH Slider */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-neutral-200">Soil pH</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{whatIfPh}</span>
                  </div>
                  <input
                    type="range"
                    min="3.5"
                    max="8.5"
                    step="0.1"
                    value={whatIfPh}
                    onChange={e => setWhatIfPh(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Acidic (3.5)</span>
                    <span className="text-emerald-400">Ideal (6.0 - 7.5)</span>
                    <span>Alkaline (8.5)</span>
                  </div>
                </div>

                {/* Nitrogen Slider */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-neutral-200">Nitrogen (N) Top-up</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{whatIfN} kg/ha</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={whatIfN}
                    onChange={e => setWhatIfN(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Deficient (10)</span>
                    <span className="text-emerald-400">Optimal (80 - 120)</span>
                    <span>Excess (180)</span>
                  </div>
                </div>

                {/* Temperature Slider */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-neutral-200">Canopy Temperature</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{whatIfTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="48"
                    step="1"
                    value={whatIfTemp}
                    onChange={e => setWhatIfTemp(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Cool (15°C)</span>
                    <span className="text-emerald-400">Comfort (20 - 28°C)</span>
                    <span>Heat Stress (48°C)</span>
                  </div>
                </div>

                {/* Soil Quality Slider */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-neutral-200">Soil Quality / Organic Carbon</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{whatIfQuality} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={whatIfQuality}
                    onChange={e => setWhatIfQuality(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Depleted (1.0)</span>
                    <span className="text-emerald-400">High Organic (4.0+)</span>
                    <span>Prime (5.0)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Algorithm Battleground (Multi-Model Benchmark) ── */}
          {resultTab === 'models' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 size={20} className="text-cyan-400" />
                  <h3 className="text-base md:text-lg font-bold text-white tracking-wide">{t.multiModelTitle}</h3>
                </div>
                <p className="text-xs text-neutral-400 mb-6">{t.multiModelSubtitle}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {result.model_benchmarks.map((m, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{m.architecture.split(' ')[0]}</span>
                          <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-white/10">R² = {m.r2_score}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-3">{m.model_name}</h4>
                        
                        <div className="mb-4">
                          <span className="text-3xl font-black text-white font-mono">{m.predicted_yield}</span>
                          <span className="text-xs text-neutral-400 ml-1">{m.unit}</span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-neutral-400">
                        <div className="flex justify-between">
                          <span>RMSE Error:</span>
                          <span className="text-neutral-200 font-mono">{m.rmse} t/ha</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span className="text-emerald-400 font-mono">{m.confidence_interval}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Economic ROI & Fertilizer Cost Analysis (₹ INR) ── */}
          {resultTab === 'economics' && (
            <div className="space-y-6">
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-2xl bg-neutral-900/60">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={20} className="text-amber-400" />
                  <h3 className="text-base md:text-lg font-bold text-white tracking-wide">{t.economicTitle}</h3>
                </div>
                <p className="text-xs text-neutral-400 mb-6">
                  Cost-benefit projection based on Indian subsidized input prices and Government Minimum Support Price (MSP).
                </p>

                {/* 4 Stat Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-xs text-neutral-400 font-medium">Estimated Input Cost</span>
                    <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                      ₹{result.economic_analysis.estimated_input_cost_inr.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-neutral-500">For {areaAcres} acres</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-xs text-neutral-400 font-medium">Potential Harvest Gain</span>
                    <div className="text-2xl font-black text-white font-mono mt-1">
                      +{result.economic_analysis.potential_yield_gain_tonnes} t
                    </div>
                    <span className="text-[10px] text-neutral-500">MSP: ₹{result.economic_analysis.crop_msp_per_quintal_inr}/quintal</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-xs text-emerald-300 font-medium">Projected Net Profit</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      ₹{result.economic_analysis.net_profit_inr.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-emerald-500 font-semibold">After subtracting fertilizer costs</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-xs text-neutral-400 font-medium">Return on Investment</span>
                    <div className="text-2xl font-black text-white font-mono mt-1">
                      {result.economic_analysis.roi_multiplier}x
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">Net multiplier return</span>
                  </div>
                </div>

                {/* Itemized Fertilizer Breakdown */}
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-black/30 border-b border-white/10 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Recommended Input Amendments & Cost Breakdown
                  </div>
                  <div className="divide-y divide-white/5 text-xs">
                    {result.economic_analysis.fertilizers_breakdown.map((item, idx) => (
                      <div key={idx} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02]">
                        <div>
                          <div className="font-semibold text-white">{item.item_name}</div>
                          <div className="text-neutral-400 text-[11px]">{item.dosage} • {item.unit_cost_inr}</div>
                        </div>
                        <div className="font-mono font-bold text-amber-400">
                          ₹{item.total_cost_inr.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: Satellite NDVI & Crop Canopy Vigor ── */}
          {resultTab === 'satellite' && (
            <div className="space-y-6">
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-2xl bg-neutral-900/60">
                <div className="flex items-center gap-2 mb-1">
                  <Satellite size={20} className="text-emerald-400" />
                  <h3 className="text-base md:text-lg font-bold text-white tracking-wide">{t.satelliteTitle}</h3>
                </div>
                <p className="text-xs text-neutral-400 mb-6">
                  Simulated multi-spectral satellite reflectance (NDVI) matching Sentinel-2 & Landsat-8 remote sensing protocols.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gauge Card */}
                  <div className="p-6 rounded-2xl bg-neutral-900/90 border border-white/10 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">Vegetation Index (NDVI)</span>
                    <div className="text-5xl font-black text-emerald-400 font-mono mb-2">
                      {result.satellite_vegetation.estimated_ndvi}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                      result.satellite_vegetation.estimated_ndvi >= 0.65
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : result.satellite_vegetation.estimated_ndvi >= 0.45
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {result.satellite_vegetation.vigor_status}
                    </span>
                  </div>

                  {/* Spectral Bands */}
                  <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Spectral Reflectance Profile</h4>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Near-Infrared (NIR - Band 8):</span>
                        <span className="font-mono text-emerald-400 font-bold">{result.satellite_vegetation.spectral_band_nir}</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${result.satellite_vegetation.spectral_band_nir * 150}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Red Absorption (Red - Band 4):</span>
                        <span className="font-mono text-rose-400 font-bold">{result.satellite_vegetation.spectral_band_red}</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${result.satellite_vegetation.spectral_band_red * 250}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-neutral-400">
                      <strong>Platform:</strong> {result.satellite_vegetation.sensor_platform} • <strong>VCI Score:</strong> {result.satellite_vegetation.vegetation_condition_index}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
