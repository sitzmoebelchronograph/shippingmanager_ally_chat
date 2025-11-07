# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for compiling all Python helper scripts.
Usage: pyinstaller build-python.spec
"""

block_cipher = None

# get_session_windows.py
session_windows = Analysis(
    ['../helper/get_session_windows.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'win32crypt',
        'win32api',
        'cryptography',
        'selenium',
        'selenium.webdriver',
        'selenium.webdriver.chrome.service',
        'selenium.webdriver.firefox.service',
        'selenium.webdriver.edge.service',
        'selenium.webdriver.chrome.options',
        'selenium.webdriver.firefox.options',
        'selenium.webdriver.edge.options'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

session_windows_pyz = PYZ(session_windows.pure, session_windows.zipped_data, cipher=block_cipher)

session_windows_exe = EXE(
    session_windows_pyz,
    session_windows.scripts,
    session_windows.binaries,
    session_windows.zipfiles,
    session_windows.datas,
    [],
    name='get-session-windows',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None
)

# login_dialog.py
login_dialog = Analysis(
    ['../helper/login_dialog.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['selenium', 'PIL'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

login_dialog_pyz = PYZ(login_dialog.pure, login_dialog.zipped_data, cipher=block_cipher)

login_dialog_exe = EXE(
    login_dialog_pyz,
    login_dialog.scripts,
    login_dialog.binaries,
    login_dialog.zipfiles,
    login_dialog.datas,
    [],
    name='login-dialog',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console for GUI
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../helper/installer/icon.ico'
)

# session_selector.py
session_selector = Analysis(
    ['../helper/session_selector.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

session_selector_pyz = PYZ(session_selector.pure, session_selector.zipped_data, cipher=block_cipher)

session_selector_exe = EXE(
    session_selector_pyz,
    session_selector.scripts,
    session_selector.binaries,
    session_selector.zipfiles,
    session_selector.datas,
    [],
    name='session-selector',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console for GUI
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../helper/installer/icon.ico'
)

# expired_sessions_dialog.py
expired_sessions_dialog = Analysis(
    ['../helper/expired_sessions_dialog.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

expired_sessions_dialog_pyz = PYZ(expired_sessions_dialog.pure, expired_sessions_dialog.zipped_data, cipher=block_cipher)

expired_sessions_dialog_exe = EXE(
    expired_sessions_dialog_pyz,
    expired_sessions_dialog.scripts,
    expired_sessions_dialog.binaries,
    expired_sessions_dialog.zipfiles,
    expired_sessions_dialog.datas,
    [],
    name='expired-sessions-dialog',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console for GUI
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../helper/installer/icon.ico'
)
