import requests
import json
import os

def read_urls_from_file(file_path):
    """
    从文件中读取URL列表
    
    Args:
        file_path: 包含URL列表的文件路径
        
    Returns:
        包含URL的列表
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f.readlines() if line.strip()]
        return urls
    except Exception as e:
        print(f"读取URL文件时发生错误: {e}")
        return []

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
    
    # 从文件中读取URL列表
    urls_file = "d:/00同步文件/00程序/docs-xx/urls.txt"
    url_list = read_urls_from_file(urls_file)
    
    # 如果没有读取到URL，使用一些默认URL作为备选
    if not url_list:
        print("未从文件中读取到URL，使用默认URL列表")
        url_list = [
            "https://sakaay.com/",
            "https://sakaay.com/about/me",
            "https://sakaay.com/about/website"
        ]
    
    # 请求数据
    data = {
        "host": "www.sakaay.com",
        "key": "512d3574871e40a7aa2582e5fbf9c3d3",
        "keyLocation": "https://www.sakaay.com/512d3574871e40a7aa2582e5fbf9c3d3.txt",
        "urlList": url_list
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
    # 首先运行URL提取脚本
    try:
        import extract_urls
        print("运行URL提取脚本...")
        extract_urls.extract_urls_from_xml()
    except ImportError:
        print("未找到extract_urls模块，请确保已创建该文件")
    except Exception as e:
        print(f"运行URL提取脚本时发生错误: {e}")
    
    # 然后运行测试
    print("\n运行IndexNow提交测试...")
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