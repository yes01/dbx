use serde::Serialize;

use crate::models::connection::SshTunnelConfig;
use crate::path_utils::expand_tilde;

const DEFAULT_USER_SENTINEL: &str = "root";
const DEFAULT_PORT_SENTINEL: u16 = 22;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SshConfigHostEntry {
    pub alias: String,
    pub host_name: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub identity_file: Option<String>,
}

pub fn list_hosts() -> Result<Vec<SshConfigHostEntry>, String> {
    let path = expand_tilde("~/.ssh/config");
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(parse_ssh_config(&content)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(err) => Err(format!("Failed to read {path}: {err}")),
    }
}

pub fn find_host(alias: &str) -> Option<SshConfigHostEntry> {
    list_hosts().ok()?.into_iter().find(|entry| entry.alias == alias)
}

pub fn resolve_ssh_tunnel_config(ssh: &SshTunnelConfig) -> SshTunnelConfig {
    match find_host(&ssh.host) {
        Some(entry) => apply_host_entry(ssh, entry),
        None => ssh.clone(),
    }
}

fn apply_host_entry(ssh: &SshTunnelConfig, entry: SshConfigHostEntry) -> SshTunnelConfig {
    let mut resolved = ssh.clone();

    if let Some(host_name) = entry.host_name {
        resolved.host = host_name;
    }
    if resolved.user == DEFAULT_USER_SENTINEL {
        if let Some(user) = entry.user {
            resolved.user = user;
        }
    }
    if resolved.port == DEFAULT_PORT_SENTINEL {
        if let Some(port) = entry.port {
            resolved.port = port;
        }
    }
    if resolved.key_path.is_empty() {
        if let Some(identity_file) = entry.identity_file {
            resolved.key_path = identity_file;
        }
    }

    resolved
}

fn parse_ssh_config(content: &str) -> Vec<SshConfigHostEntry> {
    let mut entries: Vec<SshConfigHostEntry> = Vec::new();
    let mut current_aliases: Vec<String> = Vec::new();

    for raw_line in content.lines() {
        let line = strip_comment(raw_line).trim();
        if line.is_empty() {
            continue;
        }
        let Some((keyword, value)) = split_directive(line) else {
            continue;
        };

        match keyword.to_ascii_lowercase().as_str() {
            "host" => {
                current_aliases = value
                    .split_whitespace()
                    .filter(|alias| !alias.contains('*') && !alias.contains('?'))
                    .map(str::to_string)
                    .collect();
                for alias in &current_aliases {
                    entries.push(SshConfigHostEntry {
                        alias: alias.clone(),
                        host_name: None,
                        port: None,
                        user: None,
                        identity_file: None,
                    });
                }
            }
            "hostname" => set_current_field(&mut entries, &current_aliases, |entry| {
                entry.host_name = Some(value.to_string());
            }),
            "port" => {
                if let Ok(port) = value.parse::<u16>() {
                    set_current_field(&mut entries, &current_aliases, |entry| {
                        entry.port = Some(port);
                    });
                }
            }
            "user" => set_current_field(&mut entries, &current_aliases, |entry| {
                entry.user = Some(value.to_string());
            }),
            "identityfile" => set_current_field(&mut entries, &current_aliases, |entry| {
                entry.identity_file = Some(value.to_string());
            }),
            _ => {}
        }
    }

    entries
}

fn set_current_field(
    entries: &mut [SshConfigHostEntry],
    current_aliases: &[String],
    apply: impl Fn(&mut SshConfigHostEntry),
) {
    for entry in entries.iter_mut() {
        if current_aliases.contains(&entry.alias) {
            apply(entry);
        }
    }
}

fn strip_comment(line: &str) -> &str {
    match line.find('#') {
        Some(index) => &line[..index],
        None => line,
    }
}

fn split_directive(line: &str) -> Option<(&str, &str)> {
    let line = line.trim();
    let split_index = line.find(|c: char| c.is_whitespace() || c == '=')?;
    let keyword = &line[..split_index];
    let value = line[split_index..].trim_start_matches(|c: char| c.is_whitespace() || c == '=').trim();
    if keyword.is_empty() || value.is_empty() {
        return None;
    }
    Some((keyword, value))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(host: &str) -> SshTunnelConfig {
        SshTunnelConfig {
            id: "1".to_string(),
            name: String::new(),
            enabled: true,
            host: host.to_string(),
            port: DEFAULT_PORT_SENTINEL,
            user: DEFAULT_USER_SENTINEL.to_string(),
            password: String::new(),
            key_path: String::new(),
            key_passphrase: String::new(),
            connect_timeout_secs: 5,
            expose_lan: false,
            use_ssh_agent: false,
            ssh_agent_sock_path: String::new(),
        }
    }

    #[test]
    fn parses_basic_host_block() {
        let entries = parse_ssh_config(
            "Host myserver\n  HostName 10.0.0.5\n  Port 2222\n  User deploy\n  IdentityFile ~/.ssh/id_ed25519\n",
        );
        assert_eq!(entries.len(), 1);
        let entry = &entries[0];
        assert_eq!(entry.alias, "myserver");
        assert_eq!(entry.host_name, Some("10.0.0.5".to_string()));
        assert_eq!(entry.port, Some(2222));
        assert_eq!(entry.user, Some("deploy".to_string()));
        assert_eq!(entry.identity_file, Some("~/.ssh/id_ed25519".to_string()));
    }

    #[test]
    fn resolve_fills_unset_fields_from_matching_alias() {
        let resolved = apply_host_entry(
            &config("myserver"),
            SshConfigHostEntry {
                alias: "myserver".to_string(),
                host_name: Some("10.0.0.5".to_string()),
                port: Some(2222),
                user: Some("deploy".to_string()),
                identity_file: Some("~/.ssh/id_ed25519".to_string()),
            },
        );
        assert_eq!(resolved.host, "10.0.0.5");
        assert_eq!(resolved.port, 2222);
        assert_eq!(resolved.user, "deploy");
        assert_eq!(resolved.key_path, "~/.ssh/id_ed25519");
    }
}
