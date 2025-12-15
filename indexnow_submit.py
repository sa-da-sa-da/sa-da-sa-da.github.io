import requests
import json

def submit_indexnow():
    """
    向IndexNow API提交URL更新通知
    """
    # API端点
    url = "https://api.indexnow.org/IndexNow"
    
    # 请求头
    headers = {
        "Content-Type": "application/json; charset=utf-8"
    }
    
    # 请求数据
    data = {
        "host": "www.sakaay.com",
        "key": "512d3574871e40a7aa2582e5fbf9c3d3",
        "keyLocation": "https://www.sakaay.com/512d3574871e40a7aa2582e5fbf9c3d3.txt",
        "urlList": [
            "https://sakaay.com/",
            "https://sakaay.com/about/6bgai",
            "https://sakaay.com/about/friend-links",
            "https://sakaay.com/about/liuyanqu",
            "https://sakaay.com/about/love",
            "https://sakaay.com/about/me",
            "https://sakaay.com/about/pyq",
            "https://sakaay.com/about/search",
            "https://sakaay.com/about/thouht",
            "https://sakaay.com/about/time-line",
            "https://sakaay.com/about/website",
            "https://sakaay.com/about/websites",
            "https://sakaay.com/archives",
            "https://sakaay.com/articleOverview",
            "https://sakaay.com/categories",
            "https://sakaay.com/exammination/books",
            "https://sakaay.com/exammination/books/pdf-demo",
            "https://sakaay.com/exammination/books/xxjs2019bx1",
            "https://sakaay.com/exammination/books/xxjs2019bx2",
            "https://sakaay.com/exammination/books/xxjs2019xzbx1",
            "https://sakaay.com/exammination/books/xxjs2019xzbx2",
            "https://sakaay.com/exammination/books/xxjs2019xzbx3",
            "https://sakaay.com/exammination/books/xxjs2019xzbx4",
            "https://sakaay.com/exammination/books/xxjs2019xzbx5",
            "https://sakaay.com/exammination/books/xxjs2019xzbx6",
            "https://sakaay.com/exammination/books/xxjsqt",
            "https://sakaay.com/exammination/examination-basics-knowledge",
            "https://sakaay.com/exammination/examination-practice",
            "https://sakaay.com/exammination/examination-practice/01-answer",
            "https://sakaay.com/exammination/examination-practice/02-answer",
            "https://sakaay.com/exammination/examination-practice/03-answer",
            "https://sakaay.com/exammination/examination-practice/04-answer",
            "https://sakaay.com/exammination/examination-practice/05-answer",
            "https://sakaay.com/exammination/examination-practice/06-answer",
            "https://sakaay.com/exammination/examination-practice/07-answer",
            "https://sakaay.com/exammination/examination-practice/08-answer",
            "https://sakaay.com/exammination/examination-practice/09-answer",
            "https://sakaay.com/exammination/examination-practice/10-answer",
            "https://sakaay.com/exammination/examination-practice/11-answer",
            "https://sakaay.com/exammination/examination-practice/12-answer",
            "https://sakaay.com/exammination/exammination-index",
            "https://sakaay.com/exammination/excel",
            "https://sakaay.com/exammination/excel/01excelwhattodo",
            "https://sakaay.com/exammination/excel/02halfhourwps",
            "https://sakaay.com/exammination/keyboard",
            "https://sakaay.com/exammination/keyboard-mouse",
            "https://sakaay.com/exammination/online-practice",
            "https://sakaay.com/exammination/online-practice/01-practice",
            "https://sakaay.com/exammination/online-practice/02-practice",
            "https://sakaay.com/exammination/online-practice/03-practice",
            "https://sakaay.com/exammination/online-practice/04-practice",
            "https://sakaay.com/exammination/online-practice/05-practice",
            "https://sakaay.com/exammination/online-practice/06-practice",
            "https://sakaay.com/exammination/online-practice/07-practice",
            "https://sakaay.com/exammination/online-practice/08-practice",
            "https://sakaay.com/exammination/online-practice/09-practice",
            "https://sakaay.com/exammination/online-practice/10-practice",
            "https://sakaay.com/exammination/online-practice/11-practice",
            "https://sakaay.com/exammination/online-practice/12-practice",
            "https://sakaay.com/exammination/online-practice/13-practice",
            "https://sakaay.com/exammination/online-practice/14-practice",
            "https://sakaay.com/exammination/online-practice/15-practice",
            "https://sakaay.com/exammination/online-practice/16-practice",
            "https://sakaay.com/exammination/online-practice/17-practice",
            "https://sakaay.com/exammination/online-practice/18-practice",
            "https://sakaay.com/exammination/online-practice/19-practice",
            "https://sakaay.com/exammination/online-practice/20-practice",
            "https://sakaay.com/exammination/online-practice/21-practice",
            "https://sakaay.com/exammination/online-practice/22-practice",
            "https://sakaay.com/exammination/python",
            "https://sakaay.com/exammination/python/02halfhourpython",
            "https://sakaay.com/exammination/python/03tenminutesalgorithm",
            "https://sakaay.com/exammination/python/complex-selective-structure",
            "https://sakaay.com/exammination/python/compute-pai",
            "https://sakaay.com/exammination/python/earth",
            "https://sakaay.com/exammination/python/go-mars",
            "https://sakaay.com/exammination/python/hello-python",
            "https://sakaay.com/exammination/python/hello-turtle",
            "https://sakaay.com/exammination/python/hello-world",
            "https://sakaay.com/exammination/python/turtle",
            "https://sakaay.com/guide/friends-links",
            "https://sakaay.com/life/8xi9p",
            "https://sakaay.com/life/life-index",
            "https://sakaay.com/login",
            "https://sakaay.com/love/inner",
            "https://sakaay.com/love/resource",
            "https://sakaay.com/love/sonco",
            "https://sakaay.com/love/time-plan",
            "https://sakaay.com/love/wenan",
            "https://sakaay.com/love/xp5hy",
            "https://sakaay.com/nav",
            "https://sakaay.com/program",
            "https://sakaay.com/risk-link",
            "https://sakaay.com/steam/2y3oj",
            "https://sakaay.com/steam/AI",
            "https://sakaay.com/steam/AI/ComfyUI",
            "https://sakaay.com/steam/AI/ComfyUI-Zimage",
            "https://sakaay.com/steam/AI/Napkinai",
            "https://sakaay.com/steam/gcezx",
            "https://sakaay.com/steam/photography",
            "https://sakaay.com/steam/photography/ai-photography",
            "https://sakaay.com/steam/python-editor-json-example",
            "https://sakaay.com/steam/steam-index",
            "https://sakaay.com/steam/vex",
            "https://sakaay.com/steam/vex/vex-lemllib-arc-motion",
            "https://sakaay.com/steam/vex/vex-lemllib-configuration",
            "https://sakaay.com/steam/vex/vex-lemllib-download",
            "https://sakaay.com/steam/vex/vex-lemllib-driver-control",
            "https://sakaay.com/steam/vex/vex-lemllib-getting-started",
            "https://sakaay.com/steam/vex/vex-lemllib-hen-motion",
            "https://sakaay.com/steam/vex/vex-lemllib-motion-chain",
            "https://sakaay.com/steam/vex/vex-lemllib-pid-tuning",
            "https://sakaay.com/steam/vex/vex-lemllib-pure-pursuit",
            "https://sakaay.com/steam/vex/vex-programming",
            "https://sakaay.com/steam/vex/which-vex-programming-language",
            "https://sakaay.com/tags",
            "https://sakaay.com/teach/ai",
            "https://sakaay.com/teach/aiimg",
            "https://sakaay.com/teach/other/other-index",
            "https://sakaay.com/teach/teach-index",
            "https://sakaay.com/teach/tech-in-edu",
            "https://sakaay.com/teach/yw",
            "https://sakaay.com/teach/yw/assistant",
            "https://sakaay.com/teach/zg",
            "https://sakaay.com/time",
            "https://sakaay.com/tools/emoji",
            "https://sakaay.com/tools/tools-index",
            "https://sakaay.com/xingqu/hybtf",
            "https://sakaay.com/xingqu/reading",
            "https://sakaay.com/xingqu/travel",
            "https://sakaay.com/yule/movie",
            "https://sakaay.com/yule/music",
            "https://sakaay.com/yule/photo",
        ]
    }
    
    try:
        # 发送POST请求
        response = requests.post(url, headers=headers, data=json.dumps(data))
        
        # 输出响应状态码和内容
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        # 检查请求是否成功
        if response.status_code == 200:
            print("URL提交成功!")
        else:
            print(f"URL提交失败，状态码: {response.status_code}")
            
    except Exception as e:
        print(f"发送请求时发生错误: {e}")

# 测试函数
def test_indexnow_submit():
    """
    测试IndexNow提交功能，使用模拟数据
    """
    print("测试IndexNow提交功能...")
    submit_indexnow()

# 根据实际需求扩展的函数
def submit_urls_from_file(url_file, host, key, key_location):
    """
    从文件中读取URL列表并提交到IndexNow
    
    Args:
        url_file: 包含URL列表的文件路径
        host: 网站主机名
        key: IndexNow密钥
        key_location: 密钥文件的URL位置
    """
    try:
        # 读取URL文件
        with open(url_file, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f.readlines() if line.strip()]
        
        if not urls:
            print("URL文件为空!")
            return
        
        # 分批提交URL（IndexNow API通常限制每批1000个URL）
        batch_size = 1000
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i+batch_size]
            
            data = {
                "host": host,
                "key": key,
                "keyLocation": key_location,
                "urlList": batch
            }
            
            url = "https://api.indexnow.org/IndexNow"
            headers = {"Content-Type": "application/json; charset=utf-8"}
            
            response = requests.post(url, headers=headers, data=json.dumps(data))
            print(f"提交批次 {i//batch_size + 1}，状态码: {response.status_code}")
            
    except Exception as e:
        print(f"从文件提交URL时发生错误: {e}")

if __name__ == "__main__":
    # 运行测试
    test_indexnow_submit()
    
    # 如果需要从文件提交URL，可以取消下面的注释并修改参数
    '''
    submit_urls_from_file(
        url_file="urls.txt",
        host="www.example.org",
        key="143e977679fe482694f94736c68d212d",
        key_location="https://www.example.org/143e977679fe482694f94736c68d212d.txt"
    )
    '''
