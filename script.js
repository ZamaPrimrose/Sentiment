// DOM Elements
const textTab = document.querySelector('[data-tab="text"]');
const fileTab = document.querySelector('[data-tab="file"]');
const textPane = document.getElementById('text-pane');
const filePane = document.getElementById('file-pane');
const textInput = document.getElementById('text-input');
const analyzeTextBtn = document.getElementById('analyze-text-btn');
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const analyzeFileBtn = document.getElementById('analyze-file-btn');
const sentimentChart = document.getElementById('sentiment-chart');
const confidenceChart = document.getElementById('confidence-chart');
const wordFrequencyChart = document.getElementById('word-frequency-chart');
const sectionBtns = document.querySelectorAll('.section-btn');
const sectionPanes = document.querySelectorAll('.section-pane');
const sentimentList = document.getElementById('sentiment-list');
const insightsContent = document.getElementById('insights-content');
const recommendationsContent = document.getElementById('recommendations-content');
const wordCloud = document.getElementById('word-cloud');

// Chart instances
let sentimentChartInstance = null;
let confidenceChartInstance = null;
let wordFrequencyChartInstance = null;

// Analysis results
let analysisResults = [];

// Tab switching
textTab.addEventListener('click', () => {
    textTab.classList.add('active');
    fileTab.classList.remove('active');
    textPane.classList.add('active');
    filePane.classList.remove('active');
});

fileTab.addEventListener('click', () => {
    fileTab.classList.add('active');
    textTab.classList.remove('active');
    filePane.classList.add('active');
    textPane.classList.remove('active');
});

// File drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('drag-over');
}

function unhighlight() {
    dropArea.classList.remove('drag-over');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length) {
        fileInput.files = files;
        // Show file name
        dropArea.querySelector('h3').textContent = files[0].name;
    }
}

dropArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        dropArea.querySelector('h3').textContent = fileInput.files[0].name;
    }
});

// Section switching
sectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        sectionBtns.forEach(b => b.classList.remove('active'));
        sectionPanes.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Show corresponding pane
        const sectionId = btn.getAttribute('data-section');
        document.getElementById(`${sectionId}-pane`).classList.add('active');
    });
});

// Analyze text
analyzeTextBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
        alert('Please enter some text to analyze');
        return;
    }
    
    // Split text by line breaks
    const texts = text.split('\n').filter(t => t.trim());
    
    analyzeTexts(texts);
});

// Analyze file
analyzeFileBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to analyze');
        return;
    }
    
    const texts = await readFile(file);
    analyzeTexts(texts);
});

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            let texts = [];
            
            // CSV file
            if (file.name.endsWith('.csv')) {
                const results = Papa.parse(content, { header: true });
                if (results.data.length) {
                    // Assuming the first column contains text
                    const textColumn = Object.keys(results.data[0])[0];
                    texts = results.data.map(row => row[textColumn]).filter(t => t);
                }
            }
            // Excel file
            else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                // This would require a library like SheetJS to parse
                // For simplicity, we'll just return an empty array
                alert('Excel file parsing requires additional libraries. Please use CSV for now.');
                texts = [];
            }
            // Plain text
            else {
                texts = content.split('\n').filter(t => t.trim());
            }
            
            resolve(texts);
        };
        
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function analyzeTexts(texts) {
    if (texts.length === 0) {
        alert('No valid text found to analyze');
        return;
    }
    
    try {
        // Show loading state
        analyzeTextBtn.disabled = true;
        analyzeTextBtn.textContent = 'Analyzing...';
        analyzeFileBtn.disabled = true;
        analyzeFileBtn.textContent = 'Analyzing...';
        
        // Clear previous results
        analysisResults = [];
        
        // Analyze each text
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const result = await analyzeWithOpenAI(text);
            analysisResults.push(result);
            
            // Update UI after each analysis for better UX
            updateResultsUI();
        }
        
        // Generate insights and recommendations
        generateInsights();
        generateRecommendations();
        generateWordCloud();
    } catch (error) {
        console.error('Error analyzing text:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Reset buttons
        analyzeTextBtn.disabled = false;
        analyzeTextBtn.textContent = 'Analyze Sentiment';
        analyzeFileBtn.disabled = false;
        analyzeFileBtn.textContent = 'Analyze File';
    }
}

async function analyzeWithOpenAI(text) {
    const includeKeywords = document.getElementById('include-keywords').checked;
    const includeExplanations = document.getElementById('include-explanations').checked;
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI trained to perform sentiment analysis. Analyze the sentiment of the user's text and respond in JSON format with the following structure: { \"sentiment\": \"positive\", \"negative\", or \"neutral\", \"confidence\": float between 0 and 1, \"keywords\": [array of 3-5 keywords that influenced the sentiment], \"explanation\": \"brief explanation of why this sentiment was chosen\" }"
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                response_format: { type: "json_object" }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to analyze text');
        }
        
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        
        // Return the analysis result
        return {
            text,
            sentiment: result.sentiment,
            confidence: result.confidence,
            keywords: includeKeywords ? result.keywords : [],
            explanation: includeExplanations ? result.explanation : ''
        };
    } catch (error) {
        console.error('Error analyzing text:', error);
        return {
            text,
            sentiment: 'error',
            confidence: 0,
            keywords: [],
            explanation: 'Analysis failed: ' + error.message
        };
    }
}

function updateResultsUI() {
    // Update sentiment counts
    const positiveCount = analysisResults.filter(r => r.sentiment === 'positive').length;
    const neutralCount = analysisResults.filter(r => r.sentiment === 'neutral').length;
    const negativeCount = analysisResults.filter(r => r.sentiment === 'negative').length;
    const total = analysisResults.length;
    
    document.getElementById('positive-count').textContent = positiveCount;
    document.getElementById('neutral-count').textContent = neutralCount;
    document.getElementById('negative-count').textContent = negativeCount;
    
    document.getElementById('positive-percent').textContent = total ? `${Math.round((positiveCount / total) * 100)}%` : '0%';
    document.getElementById('neutral-percent').textContent = total ? `${Math.round((neutralCount / total) * 100)}%` : '0%';
    document.getElementById('negative-percent').textContent = total ? `${Math.round((negativeCount / total) * 100)}%` : '0%';
    
    // Update summary stats
    document.getElementById('total-texts').textContent = total;
    
    const avgConfidence = total ? analysisResults.reduce((sum, r) => sum + r.confidence, 0) / total : 0;
    document.getElementById('avg-confidence').textContent = `${Math.round(avgConfidence * 100)}%`;
    
    const dominantSentiment = total ? 
        positiveCount >= neutralCount && positiveCount >= negativeCount ? 'Positive' :
        neutralCount >= negativeCount ? 'Neutral' : 'Negative' : '-';
    document.getElementById('dominant-sentiment').textContent = dominantSentiment;
    
    // Update sentiment chart
    updateSentimentChart(positiveCount, neutralCount, negativeCount);
    
    // Update confidence chart
    updateConfidenceChart();
    
    // Update sentiment list
    updateSentimentList();
}

function updateSentimentChart(positive, neutral, negative) {
    const ctx = sentimentChart.getContext('2d');
    
    // Destroy previous chart instance if exists
    if (sentimentChartInstance) {
        sentimentChartInstance.destroy();
    }
    
    sentimentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [positive, neutral, negative],
                backgroundColor: ['#4ade80', '#94a3b8', '#f87171'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateConfidenceChart() {
    const ctx = confidenceChart.getContext('2d');
    const confidences = analysisResults.map(r => r.confidence * 100);
    
    // Destroy previous chart instance if exists
    if (confidenceChartInstance) {
        confidenceChartInstance.destroy();
    }
    
    if (confidences.length === 0) return;
    
    // Calculate bins for histogram
    const binCount = 10;
    const binSize = 100 / binCount;
    const bins = new Array(binCount).fill(0);
    
    confidences.forEach(c => {
        const binIndex = Math.min(Math.floor(c / binSize), binCount - 1);
        bins[binIndex]++;
    });
    
    const labels = bins.map((_, i) => {
        const min = i * binSize;
        const max = (i + 1) * binSize;
        return `${min.toFixed(0)}-${max.toFixed(0)}%`;
    });
    
    confidenceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Texts',
                data: bins,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Texts'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Confidence Level'
                    }
                }
            }
        }
    });
}

function updateSentimentList() {
    sentimentList.innerHTML = '';
    
    analysisResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'sentiment-item';
        
        // Determine color based on sentiment
        let sentimentClass = '';
        if (result.sentiment === 'positive') sentimentClass = 'positive';
        else if (result.sentiment === 'neutral') sentimentClass = 'neutral';
        else if (result.sentiment === 'negative') sentimentClass = 'negative';
        else sentimentClass = 'error';
        
        item.innerHTML = `
            <div class="sentiment-indicator ${sentimentClass}"></div>
            <div class="sentiment-text">
                <div class="text">${result.text}</div>
                ${result.explanation ? `<div class="explanation">${result.explanation}</div>` : ''}
                ${result.keywords.length ? `
                    <div class="keywords">
                        ${result.keywords.map(kw => `<span class="keyword">${kw}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="sentiment-info">
                <div class="sentiment-label">${result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}</div>
                <div class="confidence">${Math.round(result.confidence * 100)}% confidence</div>
                <div class="confidence-bar">
                    <div class="confidence-level ${sentimentClass}" style="width: ${result.confidence * 100}%"></div>
                </div>
            </div>
        `;
        
        sentimentList.appendChild(item);
    });
}

function generateInsights() {
    if (analysisResults.length === 0) return;
    
    const positive = analysisResults.filter(r => r.sentiment === 'positive');
    const negative = analysisResults.filter(r => r.sentiment === 'negative');
    const neutral = analysisResults.filter(r => r.sentiment === 'neutral');
    
    let insightsHTML = `
        <div class="insight-card">
            <h4><i class="fas fa-smile"></i> Positive Highlights</h4>
            <p>${positive.length ? `Customers frequently mentioned positive aspects like ${getTopKeywords(positive, 3).join(', ')}.` : 'No positive feedback found.'}</p>
        </div>
        
        <div class="insight-card">
            <h4><i class="fas fa-frown"></i> Areas for Improvement</h4>
            <p>${negative.length ? `Customers expressed concerns about ${getTopKeywords(negative, 3).join(', ')}. These are opportunities for enhancement.` : 'No negative feedback found.'}</p>
        </div>
        
        <div class="insight-card">
            <h4><i class="fas fa-balance-scale"></i> Neutral Observations</h4>
            <p>${neutral.length ? `Neutral comments often referenced ${getTopKeywords(neutral, 3).join(', ')}. These topics may need more context.` : 'No neutral feedback found.'}</p>
        </div>
        
        <div class="insight-card">
            <h4><i class="fas fa-key"></i> Most Influential Words</h4>
            <p>The most impactful words across all feedback were: ${getTopKeywords(analysisResults, 5).join(', ')}.</p>
        </div>
    `;
    
    insightsContent.innerHTML = insightsHTML;
}

function generateRecommendations() {
    if (analysisResults.length === 0) return;
    
    const negativeCount = analysisResults.filter(r => r.sentiment === 'negative').length;
    const total = analysisResults.length;
    const negativePercent = total ? Math.round((negativeCount / total) * 100) : 0;
    
    let recommendationsHTML = `
        <div class="recommendation-card">
            <h4><i class="fas fa-bullhorn"></i> Response Strategy</h4>
            <p>With ${negativePercent}% negative feedback, prioritize addressing the most common concerns first. Develop a communication plan to acknowledge issues and outline improvements.</p>
        </div>
        
        <div class="recommendation-card">
            <h4><i class="fas fa-tools"></i> Product Improvements</h4>
            <p>Focus development efforts on enhancing features related to ${getTopKeywordsBySentiment('negative', 3).join(', ')} based on customer feedback.</p>
        </div>
        
        <div class="recommendation-card">
            <h4><i class="fas fa-star"></i> Positive Reinforcement</h4>
            <p>Recognize and amplify positive feedback about ${getTopKeywordsBySentiment('positive', 3).join(', ')} in marketing materials to build trust.</p>
        </div>
        
        <div class="recommendation-card">
            <h4><i class="fas fa-chart-line"></i> Sentiment Tracking</h4>
            <p>Implement regular sentiment analysis to track changes over time. Set a goal to reduce negative sentiment by 20% in the next quarter.</p>
        </div>
    `;
    
    recommendationsContent.innerHTML = recommendationsHTML;
}

function getTopKeywords(results, count) {
    const keywordMap = {};
    
    results.forEach(result => {
        result.keywords.forEach(keyword => {
            const normalized = keyword.toLowerCase();
            keywordMap[normalized] = (keywordMap[normalized] || 0) + 1;
        });
    });
    
    return Object.entries(keywordMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(entry => entry[0]);
}

function getTopKeywordsBySentiment(sentiment, count) {
    const filtered = analysisResults.filter(r => r.sentiment === sentiment);
    return getTopKeywords(filtered, count);
}

function generateWordCloud() {
    wordCloud.innerHTML = '';
    
    if (analysisResults.length === 0) return;
    
    const allKeywords = analysisResults.flatMap(r => r.keywords);
    const keywordCounts = {};
    
    allKeywords.forEach(keyword => {
        const normalized = keyword.toLowerCase();
        keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1;
    });
    
    // Get top 30 keywords
    const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);
    
    // Generate word cloud
    topKeywords.forEach(([keyword, count]) => {
        const span = document.createElement('span');
        span.textContent = keyword;
        
        // Scale font size based on frequency (min 14px, max 36px)
        const fontSize = 14 + (count * 2);
        span.style.fontSize = `${fontSize}px`;
        
        // Add some random rotation for visual interest
        const rotation = Math.random() * 20 - 10; // -10 to 10 degrees
        span.style.transform = `rotate(${rotation}deg)`;
        
        // Add slight random color variation
        const hue = Math.random() * 60 - 30 + 220; // Blue-purple range
        span.style.color = `hsl(${hue}, 70%, 50%)`;
        
        wordCloud.appendChild(span);
    });
    
    // Update word frequency chart
    updateWordFrequencyChart(topKeywords);
}

function updateWordFrequencyChart(keywords) {
    const ctx = wordFrequencyChart.getContext('2d');
    
    // Destroy previous chart instance if exists
    if (wordFrequencyChartInstance) {
        wordFrequencyChartInstance.destroy();
    }
    
    if (keywords.length === 0) return;
    
    // Take top 10 for the chart
    const top10 = keywords.slice(0, 10);
    
    wordFrequencyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(k => k[0]),
            datasets: [{
                label: 'Frequency',
                data: top10.map(k => k[1]),
                backgroundColor: 'rgba(114, 9, 183, 0.7)',
                borderColor: 'rgba(114, 9, 183, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Export functionality
document.getElementById('export-csv').addEventListener('click', exportCSV);
document.getElementById('export-json').addEventListener('click', exportJSON);
document.getElementById('export-pdf').addEventListener('click', exportPDF);

function exportCSV() {
    if (analysisResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create CSV content
    let csv = 'Text,Sentiment,Confidence,Keywords,Explanation\n';
    
    analysisResults.forEach(result => {
        const row = [
            `"${result.text.replace(/"/g, '""')}"`,
            result.sentiment,
            result.confidence,
            `"${result.keywords.join(', ')}"`,
            `"${result.explanation.replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sentiment_analysis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportJSON() {
    if (analysisResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Create JSON content
    const data = {
        timestamp: new Date().toISOString(),
        totalTexts: analysisResults.length,
        results: analysisResults
    };
    
    const json = JSON.stringify(data, null, 2);
    
    // Create download link
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sentiment_analysis.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportPDF() {
    if (analysisResults.length === 0) {
        alert('No data to export');
        return;
    }
    
    alert('PDF export requires additional libraries. In a full implementation, this would generate a PDF report.');
    // In a real implementation, this would use jsPDF and html2canvas to generate a PDF
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize charts with empty data
    updateSentimentChart(0, 0, 0);
    updateConfidenceChart();
});