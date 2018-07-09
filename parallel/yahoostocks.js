(function() {
  var columns = "snb2b3jkj1ra2"

  function makeURL(symbols) {
    return "http://finance.yahoo.com/d/quotes.csv?s=" +
           symbols.join('+') + 
           "&f=" +
           columns;
  };

  function getData(urls, callback) {
    var completed = _(urls).map(function() { return false });
    var data = [];
    _(urls).each(function(url, i) {
      console.log(url);
      $.get(url, function(d) {
        console.log(d);
        data[i] = d;
        completed[i] = true;
        if (_.all(completed, _.identity)) {
          callback(data);
        }
      });
    });
  };

  var symbols = [
    "MMM","ACE","ABT","ANF","ADBE","AMD","AES","AET",
    "AFL","A","APD","ARG","AKS","AKAM","AA","ATI","AGN",
    "ALL","ALTR","MO","AMZN","AEE","AEP","AXP","AIG",
    "AMT","AMP","ABC","AMGN","APH","APC","ADI","AON",
    "APA","AIV","APOL","AAPL","AMAT","ADM","AIZ","T",
    "ADSK","ADP","AN","AZO","AVB","AVY","AVP","BHI",
    "BLL","BAC","BK","BCR","BAX","BBT","BDX","BBBY",
    "BMS","BRK.B","BBY","BIG","BIIB","BLK","HRB","BMC",
    "BA","BXP","BSX","BMY","BRCM","BF.B","CHRW","CA",
    "CVC","COG","CAM","CPB","COF","CAH","CFN","KMX",
    "CCL","CAT","CBG","CBS","CELG","CNP","CTL","CERN",
    "CF","SCHW","CHK","CVX","CB","CI","CINF","CTAS",
    "CSCO","C","CTXS","CLF","CLX","CME","CMS","COH",
    "KO","CCE","CTSH","CL","CMCSA","CMA","CSC","CPWR",
    "CAG","COP","CNX","ED","STZ","CEG","GLW","COST",
    "CVH","COV","CSX","CMI","CVS","DHI","DHR","DRI",
    "DVA","DF","DE","DELL","DNR","XRAY","DVN","DV",
    "DO","DTV","DFS","DISCA","D","RRD","DOV","DOW",
    "DPS","DTE","DD","DUK","DNB","ETFC","EMN","ETN",
    "EBAY","ECL","EIX","EW","EP","EA","EMC","EMR",
    "ETR","EOG","EQT","EFX","EQR","EL","EXC","EXPE",
    "EXPD","ESRX","XOM","FFIV","FDO","FAST","FII",
    "FDX","FIS","FITB","FHN","FSLR","FE","FISV","FLIR",
    "FLS","FLR","FMC","FTI","F","FRX","BEAM","BEN",
    "FCX","FTR","GME","GCI","GPS","GD","GE","GIS",
    "GPC","GNW","GILD","GS","GR","GT","GOOG","GWW",
    "HAL","HOG","HAR","HRS","HIG","HAS","HCP","HCN",
    "HNZ","HP","HES","HPQ","HD","HON","HRL","HSP","HST",
    "HCBK","HUM","HBAN","ITW","TEG","INTC","ICE","IBM",
    "IFF","IGT","IP","IPG","INTU","ISRG","IVZ","IRM",
    "XYL","JBL","JEC","CBE","JDSU","JNJ","JCI","JOY",
    "JPM","JNPR","K","KEY","KMB","KIM","KLAC","KSS",
    "KFT","KR","LLL","LH","LM","LEG","LEN","LUK","LXK",
    "LIFE","LLY","LTD","LNC","LLTC","LMT","L","LO",
    "LOW","LSI","MTB","M","MRO","MAR","MMC","ACN",
    "MAS","ANR","MA","MAT","MKC","MCD","MHP","MCK",
    "MJN","MWV","MHS","MDT","WFR","MRK","MET","PCS",
    "MCHP","MU","MSFT","MOLX","TAP","MON","MWW","MCO",
    "MS","MOS","MMI","MSI","MUR","MYL","NBR","NDAQ",
    "NOV","NTAP","NFLX","NWL","NFX","NEM","NWSA","NEE",
    "GAS","NKE","NI","NE","NBL","JWN","NSC","NTRS",
    "NOC","NU","CMG","NVLS","NRG","NUE","NVDA","NYX",
    "ORLY","OXY","OMC","OKE","ORCL","OI","PCAR","IR",
    "PLL","PH","PDCO","PAYX","BTU","JCP","PBCT","POM",
    "PEP","PKI","PFE","PCG","PM","PNW","PXD","PBI",
    "PCL","PNC","RL","PPG","PPL","PX","PCP","PCLN",
    "PFG","PG","PGN","PGR","PLD","PRU","PEG","PSA",
    "PHM","QEP","PWR","QCOM","DGX","RSH","RRC","RTN",
    "RHT","RF","RSG","RAI","RHI","ROK","COL","ROP",
    "ROST","RDC","R","SWY","SAI","CRM","SNDK","SLE",
    "SCG","SLB","SNI","SEE","SHLD","SRE","SHW","SIAL",
    "SPG","SLM","SJM","SNA","SO","LUV","SWN","SE","S",
    "STJ","SWK","SPLS","SBUX","HOT","STT","SRCL","SYK",
    "SUN","STI","SVU","SYMC","SYY","TROW","TGT","TEL",
    "TE","TLAB","THC","TDC","TER","TSO","TXN","TXT",
    "HSY","TRV","TMO","TIF","TWX","TWC","TIE","TJX",
    "TMK","TSS","TSN","TYC","USB","UNP","UNH","UPS",
    "X","UTX","UNM","URBN","VFC","VLO","VAR","VTR",
    "VRSN","VZ","VIA.B","V","VNO","VMC","WMT","WAG",
    "DIS","WPO","WM","WAT","WPI","WLP","WFC","WDC",
    "WU","WY","WHR","WFM","WMB","WIN","WEC","WYN",
    "WYNN","XEL","XRX","XLNX","XL","YHOO","YUM","ZMH","ZION"
  ];

  getData([
    makeURL(symbols.slice(0,175)),
    makeURL(symbols.slice(175,350)),
    makeURL(symbols.slice(350,500))
  ], function(d) { console.log(d); });
})();
